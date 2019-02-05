// A class to hold contacts for Stealthy
//
import { BaseDataObj } from './baseDataObj'

class ContactsDataObj extends BaseDataObj {
  constructor() {
    super()

    // Default Contacts
    this.data = []
  }

  initFromObj(theObj) {
    if (theObj.hasOwnProperty('data') && theObj.hasOwnProperty('time')) {
      super._initFromObj(theObj)
    } else {
      this._initFromOriginalObjFormat(theObj)
    }
  }

  _initFromOriginalObjFormat(theObj) {
    super.setData(theObj)
  }

  synchronize(anObjectToSynchronize) {
    // TODO: ...
  }

  getContactArr() {
    return this.data
  }

  setContactArr(aContactArr) {
    this.data = aContactArr
  }
}

module.exports = { ContactsDataObj }
