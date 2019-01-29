// Abstract base class for persisted data objects (i.e. contacts, settings etc.).
//
// Supports a consistent versioning scheme, modified indicator (i.e. indication
// cloud persistence is required).
//   - For example, if a new contact is added, we want to persist the contact list
//     to the cloud. This way if the user wipes out the app and then re-installs, the
//     state is maintained. But if the last time a msg was received from a contact is
//     updated, we don't need to persist that to the cloud--it's costly.
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

    if (this.synchronize === undefined) {
      throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
                          'synchronize(anObjectToSynchronize)')
    }

    this.version = undefined
    this.modified = undefined
  }

  setVersion(aUTC = undefined) {
    this.version = (aUTC) ? aUTC : Date.now()
  }

  getVersion() {
    return this.version
  }

  isNewerVersion(aBaseDataObj) {
    return (aBaseDataObj.getVersion() > this.version)
  }

  setModified(aModifiedFlag = undefined) {
    if (aModifiedFlag !== undefined) {
      this.modified = aModifiedFlag
    } else {
      this.modified = true
    }

  }
  isModified() {
    return this.modified
  }
}

module.exports = { BaseDataObj }
