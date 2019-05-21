"use strict"

const MyHabitatNode_Thing   = require('myhabitat').MyHabitatNode_Thing

class MyHabitatNode_Thing_ARTNET extends MyHabitatNode_Thing
{
  constructor(_RED, _config)
  {
    super(_RED, _config)
  }


  getEntityModuleId()
  {
    return "ARTNET"
  }


  artnetSet(_channel, _value)
  {
    this.adapterNode().artnetSet(_channel, _value)
  }


  artnetFade(_channel, _value, _fadeTime)
  {
    this.adapterNode().artnetFade(_channel, _value, _fadeTime)
  }


}


module.exports = MyHabitatNode_Thing_ARTNET