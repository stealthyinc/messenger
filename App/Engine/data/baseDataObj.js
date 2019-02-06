// Abstract base class for persisted data objects (i.e. contacts, settings etc.).
//
// Supports a consistent versioning scheme, modified indicator (i.e. indication
// cloud persistence is required).
//   - For example, if a new contact is added, we want to persist the contact list
//     to the cloud. This way if the user wipes out the app and then re-installs, the
//     state is maintained. But if the last time a msg was received from a contact is
//     updated, we don't need to persist that to the cloud--it's costly.
//
// Origin indicates if the data is from local storage or gaia.
//
// Merged indicates if the data has been merged with remote (gaia) data.
//
// TODO: in future when there are multiple instances possible, we need a merge /
//       sync abstract that defines how to merge two objects. For example:
//          - User X instance 1 adds contact A and writes contacts.json
//          - User X instance 2 has contacts.json before the write with contact A
//            and has added contact B.  We need to read the contacts.json file
//            and merge it with the state in instance 2 and then re-write it.
//
// TODO: eventually a reddis / sync manager for writing these files will be needed too.

class BaseDataObj {
  constructor() {
    if (this.constructor === BaseDataObj) {
      throw new TypeError('Abstract class "BaseDataObj" cannot be instantiated directly.')
    }

    // if (this.synchronize === undefined) {
    //   throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
    //                       'synchronize(anObjectToSynchronize)')
    // }

    this.data = undefined

    this.time = {
      cloudSaved: undefined,
      localSaved: undefined,
      modified: undefined
    }
  }

  _initFromObj(theObj) {
    if (theObj) {
      this.data = theObj.data
      this.time = theObj.time
    }
  }

  setData(theData) {
    this.data = theData
  }

  getData() {
    return (this.hasOwnProperty('data')) ? this.data : undefined
  }

  setTimeBothSaved(aUTC=undefined) {
    const timeSaved = (aUTC) ? aUTC : Date.now()
    this.time.cloudSaved = timeSaved
    this.time.localSaved = timeSaved
    this.time.modified = undefined
  }

  setTimeCloudSaved(aUTC=undefined) {
    this.time.cloudSaved = (aUTC) ? aUTC : Date.now()
    this.time.modified = undefined
  }

  getTimeCloudSaved() {
    return (this.time.hasOwnProperty('cloudSaved')) ? this.time.cloudSaved : undefined
  }

  setTimeLocalSaved(aUTC=undefined) {
    this.time.localSaved = (aUTC) ? aUTC : Date.now()
    this.time.modified = undefined
  }

  getTimeLocalSaved(aUTC=undefined) {
    return (this.time.hasOwnProperty('localSaved')) ? this.time.localSaved : undefined
  }

  setTimeModified(aUTC=undefined) {
    this.time.modified = (aUTC) ? aUTC : Date.now()
  }

  getTimeModified() {
    return (this.time.hasOwnProperty('modified')) ? this.time.modified : undefined
  }

  isModified() {
    return (this.time.hasOwnProperty('modified') &&
            (this.time.modified === undefined))
  }
}

module.exports = { BaseDataObj }
