
'use strict'

const MyHabitatProcess         = require('myhabitat').MyHabitatProcessAdapter
const MyHabitatAdapter_ARTNET  = require('../adapters/myhabitat.adapter.artnet.js')

MyHabitatProcess.processSetup(process, new MyHabitatAdapter_ARTNET(MyHabitatProcess.getEntityIdFromArgs(process.argv)))

