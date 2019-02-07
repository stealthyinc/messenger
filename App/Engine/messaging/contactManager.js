const utils = require('./../misc/utils.js')
const constants = require('./../misc/constants.js')
const runes = require('runes')
const RNFetchBlob = require('rn-fetch-blob').default
const SUMMARY_LEN = 27

// The format of the elements in contactArr (TODO: a class or something appropriate)
// {
//   description: "I eat cheetos...",
//   id: "pbj.id",
//   image: "https://gaia/blockstck.org/hub/...",
//   publicKey: "023...",
//   status: "grey", (statisIndicators.<somevalue>)
//   summary: "Confirm", (the last message from them)
//   time: "", (deprecated--heartbeat last seen statement)
//   timeMs: "", (deprecated--heartbeat last seen ms)
//   title: "Prabhaav Bhardwaj",
//   unread: 0
// }

// TODO: this should go into a file.
//
const defaultImage = '\
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAxwAAAMcCAMAAADt2VM6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyFpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoyNjAyQ0E2MzREQTIxMUU0Qjg3RTg3RDMwMzVFNjI1MyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyNjAyQ0E2NDREQTIxMUU0Qjg3RTg3RDMwMzVFNjI1MyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjI2MDJDQTYxNERBMjExRTRCODdFODdEMzAzNUU2MjUzIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjI2MDJDQTYyNERBMjExRTRCODdFODdEMzAzNUU2MjUzIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+mlNnGgAAAMZQTFRF////5+jpvL7A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'

// This class is written in such a way that new objects are allocated instead of
// re-using / connecting existing objects (b/c we wouldn't want an activeContact
// that is not contained in the contactArr).
class ContactManager {
  constructor (forceActiveContact = true) {
    this.contactArr = []
    this.activeContact = undefined
    this.forceActiveContact = forceActiveContact

    // UTC times to track when the contact array was captured for saving and
    // when it was last modified.  If dataModified > dataSaved then we need to
    // perform a save operation.
    this.contactArrSavedUTC = undefined
    this.contactArrModifiedUTC = undefined
  }

  setContactArrSaved() {
    this.contactArrSavedUTC = Date.now()
  }

  getContactArrSaved() {
    return this.contactArrSavedUTC
  }

  setContactArrModified() {
    this.contactArrModifiedUTC = Date.now()
  }

  getContactArrModified() {
    return this.contactArrModifiedUTC
  }

  isContactArrModified() {
    if ((this.contactArrSavedUTC === undefined) ||
        (this.contactArrModifiedUTC === undefined)) {
      return false
    }

    return this.contactArrModifiedUTC > this.contactArrSavedUTC
  }

  clone = (aContactManager) => {
    if (aContactManager) {
      const contactArr = aContactManager.getContacts()
      const activeContact = aContactManager.getActiveContact()

      this.forceActiveContact = aContactManager.forceActiveContact

      this.initFromArray(contactArr, activeContact)

      this.contactArrSavedUTC = aContactManager.getContactArrSaved()
      this.contactArrModifiedUTC = aContactManager.getContactArrModified()
    }
  }

  initFromArray = (aContactArr, activeContact = undefined) => {
    if (aContactArr && (aContactArr.length > 0)) {
      // Clone and then copy the contact array, but eliminate duplicate
      // contacts.
      const tempContactArr = utils.deepCopyObj(aContactArr)
      for (const aContact of tempContactArr) {
        if (ContactManager._getContactForId(aContact.id, this.contactArr)) {
          // TODO: throw / warn if duplicate detected.
          continue
        }
        this.contactArr.push(aContact)
      }

      if (activeContact) {
        // Find the cloned active contact object and assign it.
        for (const contact of this.contactArr) {
          if (contact.id == activeContact.id) {
            this.activeContact = contact
            break
          }
        }
      } else if (this.forceActiveContact) {
        this.activeContact = this.contactArr[0]
      }

      this.setContactArrSaved()
      this.contactArrModifiedUTC = undefined
    }
  }

//
//
// All contact operations:
// //////////////////////////////////////////////////////////////////////////////
//
  getContacts = () => {
    return this.contactArr
  }

  getContactIds = () => {
    const userIds = []
    for (const contact of this.contactArr) {
      userIds.push(contact.id)
    }
    return userIds
  }

  // aPKMask is the last 4 hex digits of a contact's PK
  getContactsWithMatchingPKMask = (aPKMask) => {
    const matchingContacts = []
    for (const contact of this.contactArr) {
      const pk = contact.publicKey
      if (!pk) {
        continue
      }

      const pkLast4 = pk.substr(pk.length - 4)
      if (aPKMask === pkLast4) {
        matchingContacts.push(contact)
      }
    }

    return matchingContacts
  }

//
//
// Single contact operations:
// //////////////////////////////////////////////////////////////////////////////
//
  getActiveContact = () => {
    return this.activeContact
  }

  setActiveContact = (aContact) => {
    this.activeContact = aContact
  }

  isActiveContactId = (aContactId) => {
    if (aContactId) {
      if (this.activeContact) {
        return (aContactId === this.activeContact.id)
      }
    }
    return false
  }

  isExistingContactId = (aContactId) => {
    return (this.getContact(aContactId) !== undefined)
  }

  // Returns true if we have administrator priviledges on this contact id channel
  // or ama.
  isAdministrable = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr)

      if (contact &&
          contact.hasOwnProperty('administrable')) {
        return contact.administrable
      }
    }

    return false
  }

  //
  isNotifications = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr)

      if (contact &&
          contact.hasOwnProperty('notifications')) {
        return contact.notifications
      }
    }

    // Notifications should be true unless set off. This defaults them
    // to on if they've never been set.
    return true
  }

  addNewContact = async (aContact, id, publicKey, makeActiveContact = true) => {
    const newContact = utils.deepCopyObj(aContact)
    newContact.id = id
    newContact.publicKey = publicKey

    // Defaults:
    newContact.summary = ''
    newContact.unread = 0
    newContact.base64 = ''
    if (newContact.image) {
      try {
        const headers = {}
        const res = await RNFetchBlob.fetch('GET', newContact.image, headers)
        if (res && res.info() && (res.info().status === 200)) {
          newContact.base64 = 'data:image/png;base64,' + res.base64()
        } else {  // handle other status codes
          newContact.base64 = defaultImage
        }
      } catch (error) {
       /* suppress */
      }
    }

    this.addContact(newContact, makeActiveContact)
  }

  addContact = (aContact, makeActiveContact = true) => {
    if (aContact) {
      // Check to see if we already have this contact, if so, issue an info message.
      if (this.getContact(aContact.id)) {
        // TODO: info message.
        return
      }

      this.contactArr.splice(0, 0, aContact)
      this.setContactArrModified()

      if (makeActiveContact) {
        this.activeContact = aContact
      }
    }
  }

  getContact = (aContactId) => {
    if (aContactId) {
      return ContactManager._getContactForId(aContactId, this.contactArr)
    }
    return undefined
  }

  getContactWithPublicKey = (aPublicKey) => {
    for (const contact of this.contactArr) {
      if (contact.publicKey === aPublicKey) {
        return contact
      }
    }

    return undefined
  }

  deleteContact = (aContact) => {
    if (aContact) {
      const thisMemContact = this.getContact(aContact.id)
      if (thisMemContact) {
        const idx = this.contactArr.indexOf(thisMemContact)
        const deletingActiveContact = (this.activeContact)
          ? (thisMemContact.id === this.activeContact.id) : false

        if (idx !== -1) {
          const newContactArr = this.contactArr.slice()
          newContactArr.splice(idx, 1)

          if (deletingActiveContact) {
            if (newContactArr.length > 0) {
              this.activeContact = newContactArr[0]
            } else {
              this.activeContact = undefined
            }
          }

          this.contactArr = newContactArr
          this.setContactArrModified()
        }
      }
    }
  }

  hasPublicKey = (aContact = this.activeContact) => {
    if (aContact) {
      return (aContact.publicKey) ? (aContact.publicKey !== '') : false
    }

    return false
  }

  getPublicKey = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr)

      if (contact) {
        return contact.publicKey
      }
    }

    return ''
  }

  getProtocol = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr)

      if (contact &&
          contact.hasOwnProperty('protocol')) {
        return contact.protocol
      }
    }

    return undefined
  }

  setPublicKey = (aContactId, aPublicKey) => {
    this._setterWithChecks(aContactId, 'publicKey', aPublicKey)
  }

  setSummary = (aContactId, aSummaryStr) => {
    // TODO: Introduce code to see if this is a channel before producing the
    //       truncated summary string from the id removal regex
    const noIdSummaryStr = aSummaryStr.replace(/^.* says: /, '')
    const summaryStr = ContactManager._getTruncatedMessage(noIdSummaryStr)

    this._setterWithChecks(aContactId, 'summary', summaryStr)
  }

  setProtocol = (aContactId, aProtocol) => {
    const protocol = (aProtocol) || ''
    this._setterWithChecks(aContactId, 'protocol', protocol)
  }

  // Set's whether or not we can administrate this channel. Largely used to
  // control the UI a user sees. Does not give over-riding privilege to a user (
  // that is controlled on the channel/ama server).
  setAdministrable = (aContactId, administrable) => {
    this._setterWithChecks(aContactId, 'administrable', administrable)
  }

  // Only applicable to channels. Stores whether or not we've muted notifications
  // for a channel so when we reinstall or upgrade, we can set the notification
  // preferences accordingly.
  setNotifications = (aContactId, enable=true) => {
    const protocol = this.getProtocol(aContactId)
    if (utils.isChannelOrAma(protocol)) {
      this._setterWithChecks(aContactId, 'notifications', enable)
    }
  }

  incrementUnread = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr)

      if (contact) {
        if (contact.hasOwnProperty('unread')) {
          contact.unread += 1
        } else {
          contact.unread = 1
        }
      }
    }
  }

  setUnread = (aContactId, anUnreadCount) => {
    this._setterWithChecks(aContactId, 'unread', anUnreadCount)
  }

  clearUnread = (aContactId) => {
    this._setterWithChecks(aContactId, 'unread', 0)
  }

  getAllUnread = () => {
    let unreadCount = 0

    for (const contact of this.contactArr) {
      if (contact && contact.hasOwnProperty('unread')) {
        unreadCount += contact.unread
      }
    }

    return unreadCount
  }

  moveContactToTop = (aContactId) => {
    if (aContactId) {
      let index
      for (index in this.contactArr) {
        if (aContactId === this.contactArr[index].id) {
          break
        }
      }

      if ((index !== undefined) || (index !== 0)) {
        const contactToMoveToTop = this.contactArr.splice(index, 1)
        this.contactArr.splice(0, 0, contactToMoveToTop[0])
        this.setContactArrModified()
      }
    }
  }

  _setterWithChecks = (aContactId, aPropName, aValue) => {
    if (aContactId && aPropName) {
      const contact = this.getContact(aContactId)

      if (contact) {

        // Don't mark modified if this value is already set (saves are costly)
        if (aPropName !== 'summary' ||
            !contact.hasOwnProperty(aPropName) ||
            contact[aPropName] !== aValue) {
          this.setContactArrModified()
        }

        contact[aPropName] = aValue
      }
    }
  }

  static _getContactForId (aContactId, aContactArr) {
    for (const contact of aContactArr) {
      if (contact.id === aContactId) {
        return contact
      }
    }
    return undefined
  }

  static _getTruncatedMessage (aMessageStr) {
    if (aMessageStr) {
      if (aMessageStr.length > SUMMARY_LEN) {
        return (runes.substr(aMessageStr, 0, SUMMARY_LEN) + ' ...')
      }
      return aMessageStr
    }
    return ''
  }

  static buildContactFromQueryResult (aQueryResult, profileQuery, theirUserId, theirPublicKey) {
    let contact

    if (aQueryResult &&
        'data' in aQueryResult &&
        profileQuery in aQueryResult['data']) {
      // Oddly, fullyQualifiedName doesn't always appear in the data that is returned.
      const {profile} = aQueryResult['data'][profileQuery]

      if (profile && theirUserId) {
        const description = ('description' in profile)
                            ? profile['description'] : ''

        const imageURL = ('image' in profile &&
                          profile['image'][0] &&
                          'contentUrl' in profile['image'][0] &&
                          'name' in profile['image'][0] &&
                          profile['image'][0]['name'] === 'avatar')
                         ? profile['image'][0]['contentUrl'] : undefined

        const title = ('name' in profile) ? profile['name'] : ''

        contact = {
          description,
          id: theirUserId,
          image: imageURL,
          publicKey: theirPublicKey,
          summary: '',
          title,
          unread: 0
        }
      }
    }

    return contact
  }

  // Iterate over a contact array and make sure it's values are reasonable and
  // correct for contacts (otherwise, bugs like the channel with missing
  // profile add that affected Raji can occur.) Omit unreasonable values.
  //
  static sanitizeContactArr(aContactArr) {
    try {
      const badElements = []
      for (let index = 0, length=aContactArr.length; index < length; index++) {
        const contact = aContactArr[index]
        if (contact &&
            contact.hasOwnProperty('title') &&
            contact.hasOwnProperty('description') &&
            contact.hasOwnProperty('id')) {
          continue
        }

        badElements.unshift(index)
      }

      for (const badIndex of badElements) {
        aContactArr.splice(badIndex, 1)
      }
    } catch (error) {
      // Suppress
    }
  }
}

module.exports = { ContactManager }
