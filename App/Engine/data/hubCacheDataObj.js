// A class to hold GAIA hub entries (cached) to reduce redundant GET requests
//
import { BaseDataObj } from './baseDataObj'

class HubCacheDataObj extends BaseDataObj {
  constructor() {
    super()

    // Default state
    this.data = {}
  }

  initFromObj(theObj) {
    if (theObj.hasOwnProperty('data') &&
        theObj.hasOwnProperty('time')) {
      super._initFromObj(theObj)
    }
  }

  clearHubCache () {
    super.setTimeModified()
    this.data = {}
  }

  setHubCacheEntry (aUserName, anAppUrl, hubUrl) {
    console.log(`INFO(HubCacheDataObj::setHubCacheEntry): adding entry for user ${aUserName}, app ${anAppUrl}`)
    super.setTimeModified()
    if (!this.data.hasOwnProperty(aUserName)) {
      this.data[aUserName] = {}
    }
    this.data[aUserName][anAppUrl] = hubUrl
  }

  getHubCacheEntry (aUserName, anAppUrl) {
    if (this.data.hasOwnProperty(aUserName)) {
      const userHubCache = this.data[aUserName]
      if (userHubCache && userHubCache.hasOwnProperty(anAppUrl)) {
        return userHubCache[anAppUrl]
      }
    }
    return undefined
  }

  hasHubCacheEntry (aUserName, anAppUrl) {
    if (this.getHubCacheEntry(aUserName, anAppUrl)) {
      return true
    }
    return false
  }
}

module.exports = { HubCacheDataObj }
