class Timer {
  constructor (anEventName) {
    this.startTime = Date.now()
    this.events = []

    const evt = {
      eventName: anEventName,
      time: 0
    }

    this.events.push(evt)
  }

  logEvent (anEventName) {
    const elapsedTime = Date.now() - this.startTime
    const evt = {
      eventName: anEventName,
      time: elapsedTime
    }
    this.events.push(evt)
  }

  getEvents () {
    let evtStr = 'Time (ms):\t\t\tEvent Name\n'
    evtStr += '-------------------------------------\n'
    for (const idx in this.events) {
      if (idx !== 0) {
        const evtData = this.events[idx]
        evtStr += `${evtData.time}:\t\t\t${evtData.eventName}\n`
      }
    }
    evtStr += '\n'

    return evtStr
  }
}

module.exports = { Timer }
