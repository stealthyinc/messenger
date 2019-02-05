// A class to hold user settings for Stealthy
import { BaseDataObj } from './baseDataObj'

class SettingsDataObj extends BaseDataObj {
  constructor() {
    super()

    // Default Settings
    this.data = {
      notifications: true,
      analytics: true,
      discovery: true,
      heartbeat: false,
      webrtc: false
    }
  }

  initFromObj(theObj) {
    if (theObj.hasOwnProperty('data') &&
        theObj.hasOwnProperty('time')) {
      super._initFromObj(theObj)
    } else {
      this._initFromOriginalDataFormat(theObj)
    }
  }

  _initFromOriginalDataFormat(theData) {
    super.setData(theData)
  }

  synchronize(anObjectToSynchronize) {
    // TODO: ...
  }

  getAnalytics() {
    return this.data.analytics
  }

  getNotifications() {
    return this.data.notifications
  }

  getDiscovery() {
    return this.data.discovery
  }

  toggleAnalytics() {
    super.setTimeModified()
    this.data.analytics = !this.data.analytics
  }

  toggleNotifications() {
    super.setTimeModified()
    this.data.notifications = !this.data.notifications
  }

  toggleDiscovery() {
    super.setTimeModified()
    this.data.discovery = !this.data.discovery
  }
}

module.exports = { SettingsDataObj }
