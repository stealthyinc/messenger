const EventEmitter = require('EventEmitter')

// Notes:
// This is a class that converts the React Native EventEmitter style to the
// node EventEmitter style (ie. .addListener(...) --> .on(...) ).
// 
// It also adds tracking to allow the removal of listener subscriptions.
//
export class EventEmitterAdapter extends EventEmitter {
  constructor() {
    super()
    this.listeners = {}
  }

  // Convert node 'on' method to react 'addListener' method for RN EventEmitter
  on = (eventTypeStr, listenerFn, context) => {
    const listener = this.addListener(eventTypeStr, listenerFn, context);

    // manage the listeners for subsequent off calls
    if (!(eventTypeStr in this.listeners)) {
      this.listeners[eventTypeStr] = []
    }
    this.listeners[eventTypeStr].push(listener)
  }

  off = (eventTypeStr) => {
    if (eventTypeStr in this.listeners) {
      for (const listener of this.listeners[eventTypeStr]) {
        listener.remove()
      }

      delete this.listeners[eventTypeStr]
    }
  }

  offAll = () => {
    for (const eventTypeStr in this.listeners) {
      const eventListenerArr = this.listeners[eventTypeStr]
      for (const listener of eventListenerArr) {
        if (listener) {
          listener.remove()
        }
      }
    }

    this.listeners = {}
  }
}
