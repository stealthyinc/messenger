const EventEmitter = require('EventEmitter')

// Notes:
// This class is a placeholder to isolate the engine from platform differences
// between react and react native (i.e. use this class for interoperability of
// the engine between react and react native)
//
export class EventEmitterAdapter extends EventEmitter {
  constructor() {
    super()
    this.listeners = {}
  }

  on = (eventTypeStr, listenerFn) => {
    super.on(eventTypeStr, listenerFn)
  }

  off = (eventTypeStr) => {
    super.removeAllListeners(eventTypeStr)
  }

  offAll = () => {
    super.removeAllListeners()
  }
}
