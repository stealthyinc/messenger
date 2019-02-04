// A class to hold user settings for Stealthy

class SettingsDataObj extends BaseDataObj {
  constructor() {
    super()

    // Default Settings
    this.data = {
      notifications: true,
      analytics: true,
      discovery: true,
      heartbeat: false,
      webrtc: false,
      twitterShare: false
    }
  }

  initFromStringifiedObj(theStringifiedObj) {
    let obj = undefined
    try {
      obj = JSON.parse(theStringifiedObj)
    } catch (error) {
      // Suppress and go to default values
      console.log(`ERROR(SettingsDataObj::initFromStringifiedData) - Suppressed.\n${error}`)
      return
    }

    if (obj.hasOwnProperty('data') &&
        obj.hasOwnProperty('version') &&
        obj.hasOwnProperty('modified')) {
      super._initFromObj(obj)
    } else {
      this._initFromOriginalDataFormat(obj)
    }
  }

  _initFromOriginalDataFormat(theData) {
    super.setData(theData)
  }

  getTwitterShare() {
    return this.data.twitterShare
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

  toggleTwitterShare() {

  }

  toggleAnalytics() {

  }

  toggleNotifications() {

  }

}

module.exports = { SettingsDataObj }
