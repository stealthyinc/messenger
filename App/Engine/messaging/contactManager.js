const utils = require('./../misc/utils.js');
const constants = require('./../misc/constants.js');
const statusIndicators = constants.statusIndicators;

const SUMMARY_LEN = 27;
const LEAN_PLUGIN = false;

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

// This class is written in such a way that new objects are allocated instead of
// re-using / connecting existing objects (b/c we wouldn't want an activeContact
// that is not contained in the contactArr).
class ContactManager {
  constructor(forceActiveContact=true) {
    this.contactArr = [];
    this.activeContact = undefined;
    this.pluginMode = false;
    this.dropDownContacts = [];
    this.forceActiveContact = forceActiveContact;
  }

  clone = (aContactManager) =>{
    if (aContactManager) {
      const contactArr = aContactManager.getAllContacts();
      const activeContact = aContactManager.getActiveContact();

      this.pluginMode = aContactManager.isPlugin();
      this.forceActiveContact = aContactManager.forceActiveContact;

      this.initFromArray(contactArr, activeContact);
    }
  }

  // Initialize from an array stored in the cloud (usually the first load of
  // contacts). This clears some data before proceeding to Initialize the object.
  initFromStoredArray = (aContactArr) => {
    if (aContactArr && (aContactArr.length > 0)) {
      for (const contact of aContactArr) {
        // Don't clear unread--it's confusing users into thinking they haven't lost info.
        // contact.unread = 0;
        contact.time = '';
        contact.timeMs = '';
      }
      this.initFromArray(aContactArr);
    }
  }

  initFromArray = (aContactArr, activeContact = undefined) => {
    if (aContactArr && (aContactArr.length > 0)) {
      // Clone and then copy the contact array, but eliminate duplicate
      // contacts.
      const tempContactArr = utils.deepCopyObj(aContactArr);
      for (const aContact of tempContactArr) {
        if (aContact.timeMs === undefined) {
          aContact.timeMs = '';
        }
        if (ContactManager._getContactForId(aContact.id, this.contactArr)) {
          // TODO: throw / warn if duplicate detected.
          continue;
        }
        this.contactArr.push(aContact);
      }

      if (activeContact) {
        // Find the cloned active contact object and assign it.
        for (const contact of this.contactArr) {
          if (contact.id === activeContact.id) {
            this.activeContact = contact;
            break;
          }
        }
      } else if (this.forceActiveContact) {
        this.activeContact = this.contactArr[0];
      }
      this.dropDownContacts = this.initContactDetailsForDropDown()
    }
  }

  initContactDetailsForDropDown = () => {
    const myContactArr = this.getAllContacts()
    const activeContact = this.getActiveContact();
    let contacts = []
    let key = 0;
    for (const contact of myContactArr) {
      let name = contact.id;
      if (contact.title) {
        const idx = contact.title.indexOf(' ');
        name = (idx > -1) ?
          contact.title.substr(0, idx) : contact.title;
      }
      const text = name;
      const value = contact.id;
      const image = {
        avatar: true,
        src: contact.image
      }
      if (activeContact && activeContact.id === contact.id) {
        contacts.unshift({key, text, value, image, contact, name})
      }
      else {
        contacts.push({key, text, value, image, contact, name})
      }
      key += 1;
    }
    return contacts;
  }
//
//
// ContactMgr configuration operations:
// //////////////////////////////////////////////////////////////////////////////
//
  isPlugin = () => {
    return this.pluginMode;
  }

  setPlugInMode = (aUserId) => {
    const plugInContact = this.getContact(aUserId);
    if (plugInContact) {
      this.pluginMode = true;
      this.activeContact = plugInContact;
      return;
    }

    throw `ERROR: user ID undefined in contact manager plug in mode.`
  }
//
//
// All contact operations:
// //////////////////////////////////////////////////////////////////////////////
//
  setAllContactsStatus = (aStatus = statusIndicators.offline) => {
    for (const contact of this.contactArr) {
      contact.status = aStatus;
    }
  }

  getContacts = () => {
    if (this.pluginMode && LEAN_PLUGIN) {
      return (this.activeContact) ? [this.activeContact] : [];
    }

    return this.contactArr;
  }

  getAllContacts = () => {
    return this.contactArr;
  }

  setContacts = (aContactArr) => {
    this.contactArr = (aContactArr) || [];
  }

  getContactIds = () => {
    if (this.pluginMode && LEAN_PLUGIN) {
      return (this.activeContact) ? [this.activeContact.id] : [];
    }

    const userIds = [];
    for (const contact of this.contactArr) {
      userIds.push(contact.id);
    }
    return userIds;
  }

  getAllContactIds = () => {
    const userIds = [];
    for (const contact of this.contactArr) {
      userIds.push(contact.id);
    }
    return userIds;
  }

  getDropDownContacts = () => {
    // This probably needs an update method (i.e. if a contact is added through
    // discovery after dropDownContacts is initialized).
    return this.dropDownContacts;
  }

  // aPKMask is the last 4 hex digits of a contact's PK
  getContactsWithMatchingPKMask = (aPKMask) => {
    const matchingContacts = [];
    for (const contact of this.contactArr) {
      const pk = contact.publicKey;
      if (!pk) {
        continue;
      }

      const pkLast4 = pk.substr(pk.length - 4);
      if (aPKMask == pkLast4) {
        matchingContacts.push(contact);
      }
    }

    return matchingContacts;
  }

//
//
// Single contact operations:
// //////////////////////////////////////////////////////////////////////////////
//
  getActiveContact = () => {
    return this.activeContact;
  }

  setActiveContact = (aContact) => {
    this.activeContact = aContact;
  }

  isActiveContactId = (aContactId) => {
    if (aContactId) {
      if (this.activeContact) {
        return (aContactId === this.activeContact.id);
      }
    }
    return false;
  }

  isExistingContactId = (aContactId) => {
    return (this.getContact(aContactId) !== undefined)
  }

  addNewContact = (aContact, id, publicKey, makeActiveContact = true) => {
    const newContact = utils.deepCopyObj(aContact);
    newContact.id = id;
    newContact.publicKey = publicKey;

    // Defaults:
    newContact.summary = '';
    newContact.time = '';
    newContact.unread = 0;

    this.addContact(newContact, makeActiveContact);
  }

  addContact = (aContact, makeActiveContact = true) => {
    if (aContact) {
      // Check to see if we already have this contact, if so, issue an info message.
      if (this.getContact(aContact.id)) {
        // TODO: info message.
        return;
      }

      this.contactArr.splice(0, 0, aContact);

      if (makeActiveContact) {
        this.activeContact = aContact;
      }

      this.dropDownContacts = this.initContactDetailsForDropDown();
    }
  }

  getContact = (aContactId) => {
    if (aContactId) {
      return ContactManager._getContactForId(aContactId, this.contactArr);
    }
    return undefined;
  }

  deleteContact = (aContact) => {
    if (aContact) {
      const thisMemContact = this.getContact(aContact.id);
      if (thisMemContact) {
        const idx = this.contactArr.indexOf(thisMemContact);
        const deletingActiveContact = (this.activeContact) ?
          (thisMemContact.id === this.activeContact.id) : false;

        if (idx !== -1) {
          const newContactArr = this.contactArr.slice();
          newContactArr.splice(idx, 1);

          if (deletingActiveContact) {
            if (newContactArr.length > 0) {
              this.activeContact = newContactArr[0];
            } else {
              this.activeContact = undefined;
            }
          }

          this.contactArr = newContactArr;
        }
      }
    }
  }

  hasPublicKey = (aContact = this.activeContact) => {
    if (aContact) {
      return (aContact.publicKey) ? (aContact.publicKey !== '') : false;
    }

    return false;
  }

  getPublicKey = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr);

      if (contact) {
        return contact.publicKey;
      }
    }

    return '';
  }

  getTimeMs = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr);

      if (contact &&
          contact.hasOwnProperty('timeMs')) {
        return contact.timeMs;
      }
    }

    return undefined;
  }

  setPublicKey = (aContactId, aPublicKey) => {
    this._setterWithChecks(aContactId, 'publicKey', aPublicKey);
  }

  setStatus = (aContactId, aStatus) => {
    this._setterWithChecks(aContactId, 'status', aStatus);
  }

  setSummary = (aContactId, aSummaryStr) => {
    const summaryStr = ContactManager._getTruncatedMessage(aSummaryStr);
    this._setterWithChecks(aContactId, 'summary', summaryStr);
  }

  setTime = (aContactId, aTimeStr) => {
    this._setterWithChecks(aContactId, 'time', aTimeStr);
  }

  setTimeMs = (aContactId, theTimeSinceOnlineMs) => {
    if (theTimeSinceOnlineMs) {
      this._setterWithChecks(aContactId, 'timeMs', theTimeSinceOnlineMs);
    } else {
      this._setterWithChecks(aContactId, 'timeMs', '');
    }
  }

  incrementUnread = (aContactId) => {
    if (aContactId) {
      const contact =
        ContactManager._getContactForId(aContactId, this.contactArr);

      if (contact) {
        if (contact.hasOwnProperty('unread')) {
          contact.unread += 1;
        } else {
          contact.unread = 1;
        }
      }
    }
  }

  setUnread = (aContactId, anUnreadCount) => {
    this._setterWithChecks(aContactId, 'unread', anUnreadCount);
  }

  clearUnread = (aContactId) => {
    this._setterWithChecks(aContactId, 'unread', 0);
    // document.title = "Stealthy | Decentralized Communication"
  }

  getAllUnread = () => {
    let unreadCount = 0;

    for (const contact of this.contactArr) {
      if (contact && contact.hasOwnProperty('unread')) {
        unreadCount += contact.unread;
      }
    }

    return unreadCount;
  }

  moveContactToTop = (aContactId) => {
    if (aContactId) {
      let index;
      for (index in this.contactArr) {
        if (aContactId === this.contactArr[index].id) {
          break;
        }
      }

      if ((index !== undefined) || (index !== 0)) {
        const contactToMoveToTop = this.contactArr.splice(index, 1);
        this.contactArr.splice(0, 0, contactToMoveToTop[0]);
      }
    }
  }

  _setterWithChecks = (aContactId, aPropName, aValue) => {
    if (aContactId && aPropName) {
      const contact = this.getContact(aContactId);

      if (contact) {
        contact[aPropName] = aValue;
      }
    }
  }

  static _getContactForId(aContactId, aContactArr) {
    for (const contact of aContactArr) {
      if (contact.id === aContactId) {
        return contact;
      }
    }
    return undefined;
  }

  static getContactTimeStr(aTimeInMs) {
    if (aTimeInMs && aTimeInMs === '') {
      return '...';
    }
    if (aTimeInMs && (aTimeInMs > 0)) {
      const timeInSeconds = Math.floor(aTimeInMs / 1000);
      const timeInMinutes = Math.floor(timeInSeconds / 60);
      const timeInHours = Math.floor(timeInMinutes / 60);
      const timeInDays = Math.floor(timeInHours / 24);
      if ((timeInDays > 0) && (timeInDays < 7)) {
        return `present ${timeInDays} day(s) ago.`;
      } else if ((timeInDays > 7)) {
        return 'present a week or more ago.';
      } else if (timeInHours > 0) {
        return `present ${timeInHours} hour(s) ago.`;
      } else if (timeInMinutes > 1) {
        return `present ${timeInMinutes} minute(s) ago.`;
      }
      return 'available.';
    }

    return '...';
  }

  static _getTruncatedMessage(aMessageStr) {
    if (aMessageStr) {
      if (aMessageStr.length > SUMMARY_LEN) {
        return (`${aMessageStr.substring(0, SUMMARY_LEN)} ...`);
      }
      return aMessageStr;
    }
    return '';
  }

  static buildContactFromQueryResult(aQueryResult, profileQuery, theirUserId, theirPublicKey) {
    let contact = undefined

    if (aQueryResult &&
        'data' in aQueryResult &&
        profileQuery in aQueryResult['data']) {

      // Oddly, fullyQualifiedName doesn't always appear in the data that is returned.
      const {profile} = aQueryResult['data'][profileQuery]

      if (profile && theirUserId) {
        const description = ('description' in profile) ?
                            profile['description'] : ''

        const imageURL = ('image' in profile &&
                          profile['image'][0] &&
                          'contentUrl' in profile['image'][0] &&
                          'name' in profile['image'][0] &&
                          profile['image'][0]['name'] == 'avatar') ?
                         profile['image'][0]['contentUrl'] : undefined

        const title = ('name' in profile) ? profile['name'] : ''

        contact = {
          description,
          id: theirUserId,
          image: imageURL,
          publicKey: theirPublicKey,
          status: statusIndicators.offline,
          summary: '',
          time: '',
          timeMs: '',
          title,
          unread: 0
        }
      }
    }

    return contact
  }

}

module.exports = { ContactManager };
