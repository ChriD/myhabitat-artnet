
/**
 * This class is an adapter for the habitat system which provides writable access to the ARTNET (DMX) universe
 * it uses the artnet library from https://github.com/hobbyquaker/artnet
 *
 *
 * TODOS: - Better Connection handling (error/connect)
 *          Problem is that the artnet connection is via udp socket (broadcast) and there is no info if it worked or not
 *        - maybe disable throttle of library because we make our own at 100HZ?
 *        - maybe change to https://github.com/margau/dmxnet ?!
 *
 */


'use strict'

const MyHabitatAdapter    = require('myhabitat').MyHabitatAdapter
const Artnet              = require('artnet')
const DMXLib              = require('dmxnet')


class MyHabitatAdapter_Artnet extends MyHabitatAdapter
{
  constructor(_entityId)
  {
    super(_entityId)

    const self = this

    self.artnet                 = null
    self.artnetSender           = null

    // this buffer contains the current value which will be sent to the artnet protocol
    self.buffer                 = [512]
    self.bufferUpdateInterval   = 10

    // clear the buffer
    for(var idx=0; idx<=512; idx++)
      self.buffer[idx] = 0

    // this one contains all actions which are pending (set/fade/..) and which have to be
    // processed by the main loop. E.g.:
    // { channel: 1, value : 133,  action : 'fade', step: 0.34 }
    // { channel: 2, value : 75,   action : 'set' }
    self.bufferAction = []

    // the buffer has to be updated on intervall, if there is something to do the changes
    // will be sent to the artnet library
    self.bufferUpdateIntervalId = setInterval(function(){
      self.updateArtnetBuffer()
    }, self.bufferUpdateInterval)


    self.adapterState.connection = {}
    self.adapterState.connection.host             = ""
    self.adapterState.connection.port             = 0
    self.adapterState.connection.universe         = 0
    self.adapterState.connection.dataRefresh      = 0
    self.adapterState.counters = {}
    self.adapterState.counters.processedActions   = 0

  }


  getEntityModuleId()
  {
    return "ARTNET"
  }


  setup(_configuration)
  {
    super.setup(_configuration)
    this.setupArtnetConnection()
  }


  setupArtnetConnection()
  {
    const self = this
    //self.artnet = new Artnet(this.configuration)
    self.artnet = new DMXLib.dmxnet({})
    self.artnetSender = self.artnet.newSender({
      ip: self.configuration.host,
      subnet: 0,
      universe: self.configuration.universe,
      net: 0,
      port: self.configuration.port,
      base_refresh_interval : self.configuration.refresh
    });

    self.adapterState.connection.host         = self.configuration.host
    self.adapterState.connection.port         = self.configuration.port
    self.adapterState.connection.universe     = self.configuration.universe
    self.adapterState.connection.dataRefresh  = self.configuration.refresh

    self.logDebug('Establish connection to ' + self.configuration.host + ':' + self.configuration.port)

    //self.artnet.on('error', function(_error){
    //    self.logError("Error: " + _error.toString(), _error)
    //  })
  }


  close()
  {
    //if(this.artnet)
    //    this.artnet.close()
    //this.artnet = null
    if(this.artnetSender)
    {
      this.artnetSender.stop()
      this.artnetSender = null
    }

    if(this.bufferUpdateIntervalId)
      clearInterval(this.bufferUpdateIntervalId)

    super.close()
  }


  input(_data)
  {
    const channel   = _data.channel-1
    _data.action    = _data.action   ? _data.action.toUpperCase()    : "SET"

    if(!channel || channel < 0)
    {
      this.logError('Calling action on channel 0 or null')
      return
    }

    // we do need to have a value in the data object. At least if we are haveing the action 'set' or 'fadeto'
    // if we are implementing more actions we have to adapt this code
    if(isNaN(_data.value))
    {
      this.logError('Calling action without any value')
      return
    }

    switch(_data.action)
    {
      case "SET":
        // we can use a 1:1 link of the given data object. No need to copy.
        this.bufferAction[channel] = _data
        this.logTrace('Created buffer action SET with value: ' + this.bufferAction[channel].value)
        break
      case "FADETO":
        // we can use a 1:1 link of the given data object. No need to copy.
        // but we have to update/add and calc the step value each updateIntervall
        this.bufferAction[channel] = _data
        this.bufferAction[channel].fadeTime = this.bufferAction[channel].fadeTime ? this.bufferAction[channel].fadeTime : 250
        this.bufferAction[channel].step = ((this.bufferAction[channel].value - this.buffer[channel]) / this.bufferAction[channel].fadeTime) * this.bufferUpdateInterval
        this.logTrace('Created buffer action FADETO with step: ' + this.bufferAction[channel].step)
        break
      default:
        this.logError('Action \'' + _data.action + '\' not found!')
    }

    this.adapterState.counters.processedActions++
  }


  updateArtnetBuffer()
  {
    const self = this
    const keys = Object.keys(self.bufferAction)
    for(var idx=0; idx<keys.length; idx++)
    {
      try
      {
        const actionObj = self.bufferAction[keys[idx]]
        var deleteBufferAction = false
        switch(actionObj.action.toUpperCase())
        {
          case "FADETO":
          self.buffer[actionObj.channel-1] += actionObj.step
            if( (actionObj.step > 0 && self.buffer[actionObj.channel-1] >= actionObj.value) ||
                (actionObj.step < 0 && self.buffer[actionObj.channel-1] <= actionObj.value) ||
                (actionObj.step === 0 || self.buffer[actionObj.channel-1] == actionObj.value)
              )
              {
                self.buffer[actionObj.channel-1] = actionObj.value
                deleteBufferAction = true
              }
            break
          case "SET":
          self.buffer[actionObj.channel-1] = actionObj.value
            deleteBufferAction = true
            break
          default:
          self.logError('Action \'' + actionObj.action + '\' not found!')
        }
        self.logTrace('Buffer ' + actionObj.action + ' action on channel: ' + (actionObj.channel).toString() +  ', value: ' +  self.buffer[actionObj.channel-1].toString() + ' (to ' + actionObj.value.toString() + ' with step ' + actionObj.step.toString() + ')')

        // update the value on the artnet library        )
        //this.artnet.set(self.configuration.universe, actionObj.channel , self.buffer[actionObj.channel-1], function(_err, _res){
        //  if(_err)
        //    self.logError('Error setting artnet value: ' + _err.toString())
        //})
        self.artnetSender.prepChannel(actionObj.channel-1, self.buffer[actionObj.channel-1])

        // remove the action buffer entry for the channel if the work is done (e.g. when we have reached the desired value)
        if(deleteBufferAction)
        {
          delete self.bufferAction[keys[idx]]
          self.logTrace('Buffer ' + actionObj.action + ' action on channel: ' + (actionObj.channel).toString() + ' deleted')
        }
      }
      catch(_exception)
      {
        self.logError('Error processing artnet buffer: ' + _exception.toString(), _exception)
      }
    }

    self.artnetSender.transmit()
  }

}


module.exports = MyHabitatAdapter_Artnet