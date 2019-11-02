"use strict"

const MyHabitatNode_Adapter   = require('myhabitat').MyHabitatNode_Adapter
const Path                    = require('path')

module.exports = function(RED) {

  class MyHabitatNode_Adapter_ARTNET extends MyHabitatNode_Adapter
  {
    constructor(_config)
    {
      super(RED, _config)
      RED.nodes.createNode(this, _config)
      this.created()
    }


    getEntityModuleId()
    {
      return "ARTNET"
    }

    getEntityId()
    {
      return this.config.adapterId ? this.config.adapterId : "ARTNET01"
    }

    getAdapterProcessFile()
    {
      const ModulePath = require.resolve('../../../README.md')
      return Path.dirname(ModulePath) + '/src/processes/myhabitat.process.adapter.artnet.js'
    }

    getAdapterConfiguration()
    {
      return { host : this.config.host , port : this.config.port, refresh : this.config.bufferRefresh, universe : this.config.universe}
    }

    adapterMessage(_adapterEntity, _data)
    {
      // we have received ARTNET data
      // This is not supported by the underlaying process by now!
    }


    artnetSet(_channel, _value)
    {
      this.adapterProcess().send({ data :  {  action    : "set",
                                              channel   : _channel,
                                              value     : _value
                                            }
                                })
    }


    artnetFade(_channel, _value, _fadeTime = this.config.fadeTime)
    {
      this.adapterProcess().send({ data :  {  action    : "fadeTo",
                                              channel   : _channel,
                                              value     : _value,
                                              fadeTime  : _fadeTime
                                            }
                                })
    }

  }

  RED.nodes.registerType("myhabitat-adapter-artnet", MyHabitatNode_Adapter_ARTNET)

}