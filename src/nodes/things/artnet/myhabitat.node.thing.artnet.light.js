"use strict"

const MyHabitatNode_Thing_ARTNET  = require('./myhabitat.node.thing.artnet.js')
const Merge                       = require('lodash.merge')


module.exports = function(RED) {

  class MyHabitatNode_Thing_ARTNET_Light extends MyHabitatNode_Thing_ARTNET
  {
    constructor(_config)
    {
      super(RED, _config)
      RED.nodes.createNode(this, _config)
      this.created()
    }


    getDefaultState()
    {
      return  {
                isOn        : false,
                brightness  : 100,
                color       : {
                                white       : 127,
                                warmwhite   : 127,
                                red         : 127,
                                green       : 127,
                                blue        : 127
                              }
              }
    }


    input(_message)
    {
      super.input(_message)

      const payload = _message.payload

      // be sure we always have a state object for further processing
      if(!_message.state)
        _message.state = {}

      switch(typeof payload)
      {
        // a number is representating a brightness value
        case "number" :
          _message.state.brightness = payload
          break
        // a boolean tells us if the lamp should be on or off
        case "boolean":
          _message.state.isOn = payload === true ? true : false
          break
        // and we may have some special actions which are representated as strings
        case "string":
          if(payload.toUpperCase() === "TOGGLE")
          _message.state.isOn = this.state().isOn ? false : true
          break
        case "object":
          // we may get a direct color object in the payload
          if(payload.color)
          _message.state.color = payload.color
          break
      }

      // apply the state object which was given by the input or which was created from
      // the above code to the physical device
      if(_message.state)
      {
        if(_message.state.hasOwnProperty('isOn'))
        {
          if(_message.state.isOn)
            this.turnOn()
          else
            this.turnOff()
        }

        if(_message.state.hasOwnProperty('brightness'))
          this.setBrightness(_message.state.brightness)

        if(_message.state.hasOwnProperty('color'))
          this.setColor(_message.state.color)
      }

      this.updateNodeInfoStatus()
    }


    hasRGB()
    {
      return (this.config.lightType === "RGB" || this.config.lightType === "RGBW") ? true : false
    }

    hasWhite()
    {
      return (this.config.lightType === "SIMPLE" || this.config.lightType === "RGBW" || this.config.lightType === "TW") ? true : false
    }

    hasWarmWhite()
    {
      return (this.config.lightType === "TW") ? true : false
    }

    updateArtnetValues(_color, _brightness, _isOn = this.state().isOn)
    {
      if(this.hasWhite())
      {
        this.artnetFade(this.config.channelWhite,     _isOn ? (_color.white       * (_brightness / 100)) : 0)
      }
      if(this.hasWarmWhite())
      {
        this.artnetFade(this.config.channelWarmWhite, _isOn ? (_color.warmwhite   * (_brightness / 100)) : 0)
      }
      if(this.hasRGB())
      {
        this.artnetFade(this.config.channelRed,       _isOn ? (_color.red         * (_brightness / 100)) : 0)
        this.artnetFade(this.config.channelGreen,     _isOn ? (_color.green       * (_brightness / 100)) : 0)
        this.artnetFade(this.config.channelBlue,      _isOn ? (_color.blue        * (_brightness / 100)) : 0)
      }
    }


    turnOn()
    {
      // if we are switching on, we have to set the artnet value to the one given in the current state
      this.updateArtnetValues(this.state().color, this.state().brightness, true)
      this.state().isOn = true
    }


    turnOff()
    {
      this.updateArtnetValues({ white       : 0,
                                warmwhite   : 0,
                                red         : 0,
                                green       : 0,
                                blue        : 0}, 0, false)
      this.state().isOn = false
    }


    setColor(_color)
    {
      // we have to merge the color into the current state because the color object may not have all the
      // color properties set
      Merge(this.state().color, _color)
      this.updateArtnetValues(this.state().color, this.state().brightness)
    }

    setBrightness(_brightness)
    {
      this.updateArtnetValues(this.state().color, _brightness)
      this.state().brightness = _brightness
    }


    updateNodeInfoStatus()
    {
      super.updateNodeInfoStatus()
      let infoText = Math.round((this.state().brightness)).toString() + "%"
      let infoFill = this.state().isOn ? "green" : "red"
      this.status({fill:infoFill, shape:"dot", text: infoText})
    }


  }

  RED.nodes.registerType('myhabitat-thing-artnet-light', MyHabitatNode_Thing_ARTNET_Light)

}
