const platform = require('platform');
const { firebaseInstance } = require('./firebaseWrapper.js')

const EventEmitter = require('EventEmitter');
import EngineActions from '../Redux/EngineRedux'

import { NativeModules } from 'react-native';

const { MESSAGE_TYPE,
        MESSAGE_STATE,
        ChatMessage } = require('./messaging/chatMessage.js');
const { ConversationManager } = require('./messaging/conversationManager.js');
const { OfflineMessagingServices } = require('./messaging/offlineMessagingServices.js');

const utils = require('./misc/utils.js');
const { Anonalytics } = require('../Analytics.js');

const FirebaseIO = require('./filesystem/firebaseIO.js');
const GaiaIO = require('./filesystem/gaiaIO.js');
const { IndexedIO } = require('./filesystem/indexedIO.js');

const constants = require('./misc/constants.js');
const statusIndicators = constants.statusIndicators;

const { ContactManager } = require('./messaging/contactManager.js');

import getQueryString from './misc/getQueryString';
const { Timer } = require('./misc/timer.js');
const { Discovery } = require('./misc/discovery.js')

const common = require('./../common.js');

import API from './../Services/Api'
const api = API.create()

import chatIcon from './images/blue256.png';

// TODO: refactor to relay.js
const RELAY_IDS = ['relay.stealthy.id'];
//
const ENCRYPT_INDEXED_IO = true;
//
const ENABLE_RECEIPTS = true;
const ENABLE_RELAY = true;
let ENABLE_GAIA = true;
let ENCRYPT_MESSAGES = true;
let ENCRYPT_CONTACTS = true;
let ENCRYPT_SETTINGS = true;
//
// Options include: 'LOCALHOST', 'TEST_STEALTHY', & 'STEALTHY'
let STEALTHY_PAGE = 'LOCALHOST';
//
// Logging Scopes
const LOG_GAIAIO = false;
const LOG_OFFLINEMESSAGING = false;
//

// TODO: need a better way to indicate an ID is a relay:
//       * subdomain reg:  e.g. blockstack.relay.id   (relay.id being the subdoain)
//       * something we burn into the blockchain for a given id with a date.
//              e.g.:   pbj.id.relay_04_12_2018, pbj.id.norelay_05_12_2018
//
function isRelayId(aUserId) {
  return utils.isDef(aUserId) && RELAY_IDS.includes(aUserId);
}



export class MessagingEngine extends EventEmitter {
  constructor(logger,
              privateKey,
              publicKey,
              plugIn,
              avatarUrl,
              sessionId,
              isMobile=false) {
    super();
    this.logger = logger;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.plugIn = plugIn;
    this.avatarUrl = avatarUrl;
    this.sessionId = sessionId;
    this.isMobile = isMobile;
    this.discovery = undefined;

    this.settings = {}
    this.contactMgr = undefined;

    this.myTimer = new Timer('Enter MessagingEngine Ctor');

    this.userId = undefined;

    this.conversations = undefined;
    this.offlineMsgSvc = undefined;
    this.io = undefined;
    this.shuttingDown = false;
    this.anonalytics = undefined;

    this.listeners = {}
  }

  // Convert node 'on' method to react 'addListener' method for RN EventEmitter
  on = (eventTypeStr, listenerFn, context) => {
    const listener = this.addListener(eventTypeStr, listenerFn, context);

    // manage the listeners
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

  log = (display, ...args) => {
    if (display) {
      this.logger(...args);
    }
  }

  //
  //  API Events
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  updateContactMgr() {
    // We clone this here so that the GUI actually updates the contacts on
    // state change. (React setState didn't detect changes unless the whole array
    // object changes.)
    const contactMgr = new ContactManager(!this.isMobile);
    contactMgr.clone(this.contactMgr);

    this.emit('me-update-contactmgr', contactMgr);
  }

  updateMessages(aContactId) {
    const theMessages = this._getMessageArray(aContactId);
    this.emit('me-update-messages', theMessages);
  }

  addProfile(aUserId) {
    this.emit('me-add-profile', aUserId);
  }

  closeContactSearch() {
    this.emit('me-close-contact-search', true);
  }

  //
  //  React Component Callbacks
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //

  componentDidMountWork = (initWithFetchedData, userId) => {
    if (initWithFetchedData || !userId) {
      return
    }
    this.myTimer.logEvent('Enter componentDidMountWork')

    this.userId = userId;
    this._configureSessionManagement()
  }

  //
  //  Initialization
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  _initWithContacts(contactArr) {
    this.myTimer.logEvent('Enter _initWithContacts')

    this.contactMgr = new ContactManager(!this.isMobile);
    this.contactMgr.initFromStoredArray(contactArr);
    this.contactMgr.setAllContactsStatus();

    // Modify tool for plug-in to only focus on the contact we're workign with.
    //
    if (!this.isMobile && this.plugin) {
      // TODO: fix this when we handle TLDs properly.
      const length = getQueryString('length');
      for (let i = 0; i < length; i++) {
        const str = 'id'+i
        const recipientId = getQueryString(str)
        if (this.contactMgr.getContact(recipientId)) {
          this.contactMgr.setPlugInMode(recipientId);
          this.contactMgr.setActiveContact(this.contactMgr.getContact(recipientId))
        } else {
          this.addProfile(aUserId);
        }
      }
    }

    if (this.isMobile) {
      // No contact is selected initially in mobile, so unset the active contact
      this.contactMgr.setActiveContact(undefined);
    }

    this.updateContactMgr();

    this.offlineMsgSvc =
      new OfflineMessagingServices(this.logger,
                                   this.userId,
                                   this.idxIo,
                                   this.contactMgr.getContacts(),
                                   LOG_OFFLINEMESSAGING);
    this.offlineMsgSvc.startSendService();

    this.offlineMsgSvc.on('new messages', (messages) => {
      const unreceivedMessages = [];
      for (const message of messages) {
        if (message) {
          if ((message.type === MESSAGE_TYPE.TEXT) &&
                     (!this.conversations.hasMessage(message))) {
            unreceivedMessages.push(message);
          } else if (message.type === MESSAGE_TYPE.RECEIPT) {
            this.handleReceipt(message);
          }
        }
      }

      this.addIncomingMessage(unreceivedMessages);
      this.updateContactOrderAndStatus(unreceivedMessages);
      this.sendMessageReceipts(unreceivedMessages);
    });

    this.offlineMsgSvc.on('offline messages sent', () => {
      // The offline service has sent messages and updated their status.
      // We want to do a redraw of the current message window to update
      // status indicators (spinners--> solid gray checkmarks) and perform
      // a bundle write to store the change.
      this._writeConversations();

      const ac = this.contactMgr.getActiveContact();
      if (ac) {
        this.updateMessages(ac.id);
      }
    });

    // Lots of possiblities here (i.e. lazy load etc.)
    this.conversations = new ConversationManager(
      this.logger, this.userId, this.idxIo);

    this.conversations.loadContactBundles(this.contactMgr.getContactIds())
    .then(() => {
      // TODO TODO TODO:  change this to be an emitter that sends the ids of sent
      //                  messages back to the engine so we don't have to make
      //                  a conversations ref in offlineMsgSvc
      this.offlineMsgSvc.setConversationManager(this.conversations);

      const activeContactId = this.contactMgr.getActiveContact() ?
        this.contactMgr.getActiveContact().id : undefined;

      if (activeContactId) {
        const seenMessages = this.markReceivedMessagesSeen(activeContactId);
        this.sendMessageReceipts(seenMessages);
      }

      // TODO: send these as a packet to the other user.
      this.offlineMsgSvc.startRecvService();

      // Update the summarys for all contacts. Redux makes it so that you have to
      // use a setter to fix this issue (setting the object property directly
      // doesn't work b/c it's read only).
      //   TODO: clean this up into method(s) on conversations and contactMgr (AC)
      for (const contactId of this.contactMgr.getContactIds()) {
        const messages = this.conversations.getMessages(contactId);

        const lastMessage = (messages && (messages.length > 0)) ?
          messages[messages.length - 1].content : '';
        this.contactMgr.setSummary(contactId, lastMessage);

        if (contactId !== activeContactId) {
          let count = 0;
          for (const message of messages) {
            // Skip messages we wrote--we only count the ones we receive (
            // unless they are in the special case where we sent them to
            // ourselves).
            if (!(message.to === message.from) &&
                (this.userId === message.from)) {
              continue;
            }

            if (!message.seen) {
              count++;
            }
            if (count === 99) {
              break;
            }
          }
          this.contactMgr.setUnread(contactId, count);
        }
      }

      if (activeContactId) {
        this.updateMessages(activeContactId);
      }

      this.updateContactMgr();

      if (this.settings.discovery) {
        this.discovery = new Discovery(this.userId, this.publicKey, this.privateKey)
      }
      if (this.discovery) {
        this.discovery.on('new-invitation',
                          (theirPublicKey, theirUserId) =>
                            this.handleContactInvitation(theirPublicKey, theirUserId))

        this.discovery.monitorInvitations()
      }

      this.emit('me-initialized', true);
    })
    .catch((err) => {
      this.offlineMsgSvc.startRecvService();
      this.logger('INFO: No contact bundles to load.');
      this.emit('me-initialized', true);
    });
  }

  _configureSessionManagement() {
    // Get the firebase session lock key (assume that it's set to us, throw if it's none).
    const ref = firebaseInstance.getFirebaseRef(common.getDbSessionPath(this.publicKey))
    ref.once('value')
    .then((snapshot) => {
      if (!snapshot.exists() || snapshot.val() === common.NO_SESSION) {
        throw `ERROR(engine.js::_configureSessionManagement): session is unlocked.`;
      }
      this.logger(`INFO(engine.js::_configureSessionManagement): session is locked to ${snapshot.val()}.`);

      this._configureIO();
      return
    })
  }


  // relay.id's graphite hub for initital testing / dev work
  static RELAY_GRAPHITE_HUB = 'https://gaia.blockstack.org/hub/1PeNcCQXdg7t8iNmK7XqGVt8UyEDo4d3mF/'

  _getSimulatedIntermediateGraphiteData() {
    const simulatedData = {
      'relay.id-1532144113901' : {
        title : 'Test Stealthy Integration 2',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532144113901',
        version : '',
        appMetadata : {
          title : 'Test Stealthy Integration 2',
          id : '1532144113901',
          updated : '7/21/2018',
          words : '11',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532196940159' : {
        title : 'Delete Facebook Movement Spreads Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532196940159',
        version : '',
        appMetadata : {
          title : 'Delete Facebook Movement Spreads Worldwide',
          id : '1532196940159',
          updated : '7/21/2018',
          words : '23',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532197099770' : {
        title : 'Data Breaches on the Rise Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532197099770',
        version : '',
        appMetadata : {
          title : 'Data Breaches on the Rise Worldwide',
          id : '1532197099770',
          updated : '7/21/2018',
          words : '35',
          sharedWith : '',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
    }

    return simulatedData
  }

  _getIndexDataFromGraphite(aGraphiteIndex) {
    const indexData = {}
    const RELAY_DOC_BASES = {
      publicShare: 'https://app.graphitedocs.com/shared/docs/relay.id-',  // append <doc id>
      privateShare: `${MessagingEngine.RELAY_GRAPHITE_HUB}`, // append <doc id>sharedwith.json
      originalDoc : `${MessagingEngine.RELAY_GRAPHITE_HUB}/documents/`, // append <doc id>.json
    }

    if (aGraphiteIndex) {
      for (const element of aGraphiteIndex) {
        if (!element ||
            !element.author ||
            !element.id ||
            !element.fileType ||
            !element.title ) {
          continue
        }

        const fileName = `relay.id-${element.id}`
        const fileData = {
          title : `${element.title}`,
          description : '',
          author : `${element.author}`,
          decryptable : {
            user : 'TBD',
            key : 'Graphite'
          },
          fileUrl : `${RELAY_DOC_BASES.publicShare}${element.id}`,
          version: '',
          appMetadata: element
        }

        indexData[fileName] = fileData
      }
    }

    return indexData
  }

  async _graphiteFileRead() {
      // Psuedocode:
      //   1. Use profile lookup to get the current user's graphite gaia hub
      //   2. In that gaia hub, fetch the index file (stealthyIndex.json)
      //   3. Parse that index to produce a list of file objects with relevant
      //      metadata.

      // TODO: finish readPartnerAppFile in gaiaIO.js

      const GRAPHITE_INDEX = 'stealthyIndex.json'
      let recovered = undefined
      try {
        const cipherTextObjStr = await this.io.readFileFromHub(GRAPHITE_INDEX, MessagingEngine.RELAY_GRAPHITE_HUB)
        recovered = await utils.decryptObj(this.privateKey, cipherTextObjStr, true)
      } catch(error) {
        throw `_graphiteFileRead: failed read.\n   ${error}`
      }

      const indexData = this._getIndexDataFromGraphite(recovered)
      // dump index Data
      console.log('const indexData = {')
      for (const fileName in indexData) {
        if (!fileName || !indexData[fileName]) {
          continue
        }
        const fileData = indexData[fileName]
        console.log(`  '${fileName}' : {`)
        console.log(`    title : '${fileData.title}',`)
        console.log(`    description : '${fileData.description}',`)
        console.log(`    author : '${fileData.author}',`)
        console.log(`    decryptable : {`)
        console.log(`      user : '${fileData.decryptable.user}',`)
        console.log(`      key : '${fileData.decryptable.key}',`)
        console.log('    },')
        console.log(`    fileUrl : '${fileData.fileUrl}',`)
        console.log(`    version : '${fileData.version}',`)
        console.log('    appMetadata : {')
        for (const key in fileData.appMetadata) {
          console.log(`      ${key} : '${fileData.appMetadata[key]}',`)
        }
        console.log('    },')
        console.log('  },')
      }
      console.log('}')
  }

  _configureIO() {
    this.io = (ENABLE_GAIA) ?
      new GaiaIO(this.logger, LOG_GAIAIO) :
      new FirebaseIO(this.logger, STEALTHY_PAGE, LOG_GAIAIO);

    if (process.env.NODE_ENV !== 'production') {
      if (this.userId === 'relay.id') {
        this._graphiteFileRead()
      } else {
        const simulatedData = this._getSimulatedIntermediateGraphiteData()
        // TODO: PBJ work with this to display UI
      }
    }

    this._fetchUserSettings();
  }

  _fetchUserSettings() {
    this.myTimer.logEvent('Enter _fetchUserSettings')

    this.io.readLocalFile(this.userId, 'settings.json')
    .then((settingsData) => {
      if (settingsData && settingsData !== null) {
        utils.decryptObj(this.privateKey, settingsData, ENCRYPT_SETTINGS)
        .then(settingsData => {
          this.settings = settingsData
          this.emit('me-update-settings', this.settings);
          this._fetchDataAndCompleteInit();
        })
        .catch(err => {
          console.log(`ERROR reading settings.json: ${err}`)
        })
      } else {
        // THIS HAPPENS FIRST TIME ONLY
        // centralized discovery on by default
        this.logger('No data read from settings file. Initializing with default settings.');
        this.settings = {
          notifications: true,
          discovery: true,
          heartbeat: false,
          webrtc: false,
        }
        if (!this.plugin && !this.isMobile) {
          this.addProfile('relay.stealthy');
          this.addProfile('stealthy');
          // this.handleIntroOpen();
          this.emit('me-handle-intro-open');
        }

        this.emit('me-update-settings', this.settings);
        this._fetchDataAndCompleteInit();
      }
    })
    .catch((error) => {
      // TODO: Prabhaav--shouldn't this set the default settings from above?
      this.logger('Error', error);
      this.emit('me-update-settings', this.settings);
      this._fetchDataAndCompleteInit();
      this.logger('ERROR: Reading settings.');
    });
  }

  _fetchDataAndCompleteInit() {
    this.myTimer.logEvent('Enter _fetchDataAndCompleteInit')

    if (this.anonalytics === undefined) {
      this.anonalytics = new Anonalytics(this.publicKey);
    }

    this.anonalytics.aeLogin();
    this.anonalytics.aePlatformDescription(platform.description);

    const appToken = (this.isMobile) ? undefined : getQueryString('app');
    let context = utils.getAppContext(appToken);
    this.anonalytics.aeLoginContext(context);

    this.idxIo = new IndexedIO(this.logger, this.io, this.userId, this.privateKey, this.publicKey, ENCRYPT_INDEXED_IO);

    this.io.writeLocalFile(this.userId, 'pk.txt', this.publicKey);

    let contactArr = [];
    this.io.readLocalFile(this.userId, 'contacts.json')
    .then((contactsData) => {
      if (contactsData && contactsData !== null) {
        utils.decryptObj(this.privateKey, contactsData, ENCRYPT_CONTACTS)
        .then(contactArr => {
          this._initWithContacts(contactArr);

          if (!this.isMobile) {
            // add query contact if there is one
            const queryContact = getQueryString('add');
            const existingUserIds = this.contactMgr.getAllContactIds();
            const checkId = `${queryContact}.id`;
            if (queryContact && !existingUserIds.includes(checkId)) {
              this.emit('me-add-query-contact', queryContact);
            }
          }
        })
      } else {
        this.logger('No data read from contacts file. Initializing with no contacts.');
        contactArr = [];
        this._initWithContacts(contactArr);

        if (!this.isMobile) {
          // add query contact if there is one
          const queryContact = getQueryString('add');
          const existingUserIds = this.contactMgr.getAllContactIds();
          const checkId = `${queryContact}.id`;
          if (queryContact && !existingUserIds.includes(checkId)) {
            this.emit('me-add-query-contact', queryContact);
          }
        }
      }
    })
    .catch((error) => {
      // TODO: probably should error out--possibly warn about data loss. Think
      // about what happens if contacts exist but are added again (bundles probably
      // get wiped out as might the contacts.json.)
      this.logger('Error', error);
      this._initWithContacts([]);
      this.logger('ERROR: Reading contacts.');
    });
  }

  //
  //  Generic
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleShutDownRequest() {
    try {
      this.offAll()
    } catch (err) {
      // do nothing, just don't prevent the code below from happening
    }

    this.offlineMsgSvc.skipSendService();
    this.offlineMsgSvc.stopSendService();
    this.offlineMsgSvc.pauseRecvService();
    this.offlineMsgSvc.stopRecvService();

    const promises = []
    promises.push(
      this.offlineMsgSvc.sendMessagesToStorage()
      .catch(err => {
        console.log(`ERROR(engine.js::handleShutDownRequest): sending messages to storage. ${err}`);
        return undefined;
      })
    );
    promises.push(
      this._writeConversations()
      .catch(err => {
        console.log(`ERROR(engine.js::handleShutDownRequest): writing conversations. ${err}`);
        return undefined;
      })
    );
    // We stopped doing this after every incoming msg etc. to
    // speed things along, hence write here.
    //   - to avoid the popup, we should have a timer periodically write
    //     all these and use a dirty flag to determine if we even need to do this.
    promises.push(
      this._writeContactList(this.contactMgr.getAllContacts())
      .catch(err => {
        console.log(`ERROR(engine.js::handleShutDownRequest): writing contact list. ${err}`);
        return undefined;
      })
    )

    Promise.all(promises)
    .then(() => {
      this.offlineMsgSvc = undefined

      this.logger('INFO:(engine.js::handleShutDownRequest): engine shutdown successful.')
      this.emit('me-shutdown-complete', true)
      return
    })
    .catch((err) => {
      console.log(`ERROR(engine.js::handleShutDownRequest): ${err}`)
      this.emit('me-shutdown-complete', true)
      return
    })
  }

  //
  //  Mobile
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleMobileBackgroundUpdate() {
    console.log('MessagingEngine::handleMobileBackgroundUpdate:');

    // TODO: - should the service only start on background update and stop when background update done?
    //       - can the service fail if shut down inappropriately (i.e. while waiting on request)?
    if (!this.offlineMsgSvc.isReceiving()) {
      this.offlineMsgSvc.pauseRecvService();

      this.offlineMsgSvc.receiveMessages()
      .then(() => {
        this.offlineMsgSvc.resumeRecvService();
      })
      .catch((err) => {
        console.log(`ERROR:(engine.js::handleMobileBackgroundUpdate): ${err}`);
        this.offlineMsgSvc.resumeRecvService();
      })
    }
  }

  // If senderInfo provided, do an immediate fetch of that sender's messages to us.
  // SenderInfo is the last 4 of the contact's pk.
  // After fetching the messages, send an updated contact mgr to pbj.
  // If senderInfo is not provided, try and get a fetch of all messages from our contacts.
  //   TODO: display a spinner / status of that read to the user if possible.
  //
  //   TODO: challenges:
  //         - what to do if isReceiving() is true? (wait and check again?)
  //
  handleMobileNotifications(senderInfo) {
    const logPrefix = "INFO(engine.js::handleMobileNotifications)";
    console.log(`${logPrefix}: received notification ${senderInfo}`);
    let contactsToCheck = undefined;
    if (senderInfo) {
      contactsToCheck = this.contactMgr.getContactsWithMatchingPKMask(senderInfo);
    }

    if (!this.offlineMsgSvc.isReceiving()) {
      this.offlineMsgSvc.pauseRecvService();

      this.offlineMsgSvc.receiveMessages(contactsToCheck)
      .then(() => {
        this.offlineMsgSvc.resumeRecvService();
      })
      .catch((err) => {
        console.log(`ERROR:(engine.js::handleMobileNotifications): ${err}`);
        this.offlineMsgSvc.resumeRecvService();
      });
      console.log(`${logPrefix}: shortcutting offline message service with fast read.`)
    } else {
      console.log(`${logPrefix}: offline message service already receiving.`)
    }

    this.discovery.checkInvitations(this.contactMgr)
  }

  //
  //  Contact Management
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleSearchSelect(contact) {
    if (!contact || !contact.id || !this.contactMgr) {
      console.log('ERROR(engine.js::handleSearchSelect): contact or contactMgr undefined.')
      return;
    }

    let selfAddCheck = false;
    if (process.env.NODE_ENV === 'production' &&
        (contact.id !== 'alexc.id' ||
         contact.id !== 'alex.stealthy.id' ||
         contact.id !== 'relay.id')
        ) {
      selfAddCheck = (contact.id === this.userId);
    }
    if (this.contactMgr.isExistingContactId(contact.id) || selfAddCheck) {
      this.contactMgr.setActiveContact(contact);
      this.updateContactMgr();
      this.closeContactSearch();
    } else {
      this.handleContactAdd(contact);
    }
    this.emit('me-search-select-done', true);
  }

  handleContactInvitation(theirPublicKey, theirUserId) {
    // TODO: merge this with code in Block Contact Search (the part that builds up the
    //       contact by parsing the query result)
    if (!this.contactMgr.isExistingContactId(theirUserId)) {
      console.log(`INFO(engine.js): discovery event "new-invitation" from ${theirUserId}`)
      const profileQuery = utils.removeIdTld(theirUserId)
      api.getUserProfile(profileQuery)
      .then((queryResult) => {
        const contact = ContactManager.buildContactFromQueryResult(
          queryResult, profileQuery, theirUserId, theirPublicKey)
        if (contact) {
          const makeActiveContact = false
          this.handleContactAdd(contact, makeActiveContact)
        }
      })
      .catch((err) => {
        console.log(`ERROR(engine.js): handling discovery new-invitation. ${err}`)
      })
    }
  }

  async handleContactAdd(contact, makeActiveContact=true) {
    if (this.anonalytics) {
      this.anonalytics.aeContactAdded();
    }

    let publicKey = contact.publicKey
    if (!publicKey) {
      try {
        publicKey = await this._fetchPublicKey(contact.id)
        this.logger(`Adding contact ${contact.id}. Read public key: ${publicKey}`);
      } catch(err) {
        this.logger(`Adding contact ${contact.id}. UNABLE TO READ PUBLIC KEY`);
      }
    }

    this.contactMgr.addNewContact(contact, contact.id, publicKey, makeActiveContact);
    this._writeContactList(this.contactMgr.getContacts());

    this.conversations.createConversation(contact.id);
    this._writeConversations();

    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts());

    // IMPORTANT (even for Prabhaav):
    // - Do not change the order of these updates. The UI depends on
    //   contact length changed to navigate to the ChatScreen. If you
    //   update messages last, it navigates to a screen with the wrong
    //   messages.
    this.updateMessages(contact.id);
    this.updateContactMgr();

    this.closeContactSearch();
  }

  handleDeleteContact = (e, { contact }) => {
    if (this.discovery) {
      this.discovery.clearInvitation(contact.publicKey)
    }

    this.contactMgr.deleteContact(contact);

    this._writeContactList(this.contactMgr.getAllContacts());

    this.conversations.removeConversation(contact.id);
    this._writeConversations();

    this.offlineMsgSvc.removeMessages(contact);

    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts());

    const activeUser = this.contactMgr.getActiveContact();
    if (activeUser) {
      const activeUserId = activeUser.id;
      this.contactMgr.clearUnread(activeUserId);
    }

    this.updateContactMgr();
    this.updateMessages(activeUser ? activeUser.id : undefined);
  }

  handleRadio (e, { name }) {
    if (name === 'console') {
      this.settings.console = !this.settings.console;
      this.anonalytics.aeSettings(`console:${this.settings.console}`);
    } else if (name === 'notifications') {
      this.settings.notifications = !this.settings.notifications;
      // this.anonalytics.aeSettings(`passiveSearch:${this.settings.search}`);
    } else if (name === 'search') {
      this.settings.search = !this.settings.search;
      this.anonalytics.aeSettings(`passiveSearch:${this.settings.search}`);
    } else if (name === 'discovery') {
      this.settings.discovery = !this.settings.discovery;
      this.anonalytics.aeSettings(`discovery:${this.settings.discovery}`);
      if (this.settings.discovery) {
        if (!this.discovery) {
          this.discovery = new Discovery(this.userId, this.publicKey, this.privateKey)

          this.discovery.on('new-invitation',
                            (theirPublicKey, theirUserId) =>
                              this.handleContactInvitation(theirPublicKey, theirUserId))

          this.discovery.monitorInvitations()
        }
      } else {
        // TODO: discussion w/ PBJ about whether we should completely clear
        //       all invitations in the user's firebase.
        //       If we want to do this, call this.discovery.clearDiscoveryDb()
        //
        this.discovery.off('new-invitation')
        this.discovery.stop()
        this.discovery.clearDiscoveryDb()
        this.discovery = undefined
      }
    } // webrtc, heartbeat is ignored

    this.emit('me-update-settings', this.settings);
    this.writeSettings(this.settings);
  }

  updateContactPubKeys() {
    for (const contact of this.contactMgr.getContacts()) {
      const contactIds = [];
      const fetchPromises = [];
      if (!this.contactMgr.hasPublicKey(contact)) {
        contactIds.push(contact.id);
        fetchPromises.push(this._fetchPublicKey(contact.id));
      }
      Promise.all(fetchPromises)
      .then((arrPks) => {
        if (arrPks &&
            (arrPks.length > 0) &&
            (arrPks.length === contactIds.length)) {
          let needsUpdate = false;

          for (let index = 0; index < arrPks.length; index++) {
            const contactId = contactIds[index];
            const pk = arrPks[index];
            if (pk) {
              needsUpdate = true;
              this.contactMgr.setPublicKey(contactId, pk);
            }
          }

          if (needsUpdate) {
            this.updateContactMgr();
            this._writeContactList(this.contactMgr.getAllContacts());
          }
        }
      })
      .catch((err) => {
        // ignore ...
      });
    }
  }

  //
  //  Messaging
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  // TODO: refactor--this is doing a whole bunch that can be reused/reduced

  // notifyMe TODO: separate out the GUI part of this from the engine (i.e chatIcon)
  // and put the GUI part in the UI.
  notifyMe() {
    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
      // If it's okay let's create a notification
      var options = {
        body: "New Message",
        icon: chatIcon
      };
      var notification = new Notification("Stealthy", options);
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
      Notification.requestPermission((permission) => {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          var options = {
            body: "New Message",
            icon: chatIcon
          };
          var notification = new Notification("Stealthy", options);
        }
      });
    }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
  }

  // The main benefit of this over handleOutgoingMessage is to send a multitude of
  // the same message with the same time stamp while reducing the number of writes
  // to the conversations and contacts files.
  //
  handleOutgoingRelayMessage(theRecipients, aChatMsgTemplate) {
    for (const outgoingUserId of theRecipients) {
      const chatMsg = new ChatMessage();
      chatMsg.clone(aChatMsgTemplate);
      chatMsg.to = outgoingUserId;
      this.anonalytics.aeMessageSent();

      const outgoingPublicKey = this.contactMgr.getPublicKey(outgoingUserId);
      if (outgoingPublicKey) {
        this._sendOutgoingMessageOffline(chatMsg);
      } else {
        this._fetchPublicKey(outgoingUserId)
        .then((publicKey) => {
          if (publicKey) {
            this.contactMgr.setPublicKey(outgoingUserId, publicKey);
            this._writeContactList(this.contactMgr.getAllContacts());
            this.updateContactMgr();

            this.logger(`Fetched publicKey for ${outgoingUserId}.`);

            this._sendOutgoingMessageOffline(chatMsg);
          } else {
            this.logger(`Unable to fetch publicKey for ${outgoingUserId}. Cannot write response.`);
          }
        });
      }

      this.conversations.addMessage(chatMsg);
    }

    this._writeConversations();

    for (const outgoingUserId of theRecipients) {
      this.contactMgr.setSummary(outgoingUserId, chatMsgTemplate.content);
    }
    this._writeContactList(this.contactMgr.getAllContacts());
    this.updateContactMgr();

    const activeContactId = this.contactMgr.getActiveContact() ?
      this.contactMgr.getActiveContact().id : undefined;
    this.updateMessages(activeContactId);
  }

  handleOutgoingMessage = async (text) => {
    if (!this.contactMgr.getActiveContact()) {
      return
    }

    const outgoingUserId = this.contactMgr.getActiveContact().id
    let outgoingPublicKey = this.contactMgr.getPublicKey(outgoingUserId)

    if (!outgoingPublicKey) {
      try {
        outgoingPublicKey = await this._fetchPublicKey(outgoingUserId)
        if (!outgoingPublicKey) {
          throw `Public key is undefined for ${outgoingUserId}.`
        }
        this.logger(`Fetched publicKey for ${outgoingUserId}.`);
      } catch (err) {
        console.log(`ERROR(engine.js::handleOutgoingMessage): unable to fetch public key. ${err}`)
        return
      }

      this.contactMgr.setPublicKey(outgoingUserId, outgoingPublicKey);
    }

    const chatMsg = new ChatMessage();
    chatMsg.init(
      this.userId, outgoingUserId, this._getNewMessageId(), text, Date.now());
    this._sendOutgoingMessageOffline(chatMsg);
    this.anonalytics.aeMessageSent();
    if (this.discovery) {
      this.discovery.inviteContact(outgoingPublicKey);
    }

    this.conversations.addMessage(chatMsg);
    this._writeConversations();

    this.contactMgr.moveContactToTop(outgoingUserId);
    this.contactMgr.setSummary(outgoingUserId, chatMsg.content);
    this._writeContactList(this.contactMgr.getAllContacts());

    this.updateContactMgr();
    this.updateMessages(outgoingUserId);
  }

  // SO MUCH TODO TODO TODO
  //
  // Callers include anywhere messages arrive or change state to read:
  //    this.addIncomingMessage
  //    initialization method
  //    handleContactClick
  //
  sendMessageReceipts(theMessages) {
    if (!ENABLE_RECEIPTS) {
      return;
    }
    // Receipts structure:
    // {
    //   <from.id>: {
    //     recipient: <to.id/Me>,
    //     receivedMsgIds: [<msgId>, <msgId>, ...],
    //     readMsgIds: [<msgId>, <msgId>, ...],
    //   },
    //   ...
    // }
    //
    // TODO: build the receipts structure from theMessages, then sent it to
    //       the receipt dispatch method, which iterates over each object
    //       and sends it realtime or offline to the destination.
    const receipts = {};

    if (theMessages && theMessages.length > 0) {
      for (const message of theMessages) {
        const fromId = message.from;
        if (!(fromId in receipts)) {
          receipts[fromId] = {
            recipient: this.userId,
            receivedMsgIds: [],
            readMsgIds: [],
          };
        }

        if (message.msgState === MESSAGE_STATE.SEEN) {
          receipts[fromId].readMsgIds.push(message.id);
        } else {  // SENT_OFFLINE or SENT_REALTIME
          receipts[fromId].receivedMsgIds.push(message.id);
        }
      }

      this.dispatchMessageReceipts(receipts);
    }
  }

  dispatchMessageReceipts(theReceipts) {
    if (theReceipts) {
      for (const destId of Object.keys(theReceipts)) {
        const receipt = theReceipts[destId];
        const receiptMsg = new ChatMessage();
        receiptMsg.init(
            this.userId,
            destId,
            this._getNewMessageId(),
            receipt,
            Date.now(),
            MESSAGE_TYPE.RECEIPT
          );

        const destPublicKey = this.contactMgr.getPublicKey(destId);
        if (!destPublicKey) {
          this.logger(`ERROR: Unable to send receipts to ${destId}. No public key.`);
          continue;
        }

        this._sendOutgoingMessageOffline(receiptMsg);
      }
    }
  }

  handleReceipt(aChatMsg) {
    if (!ENABLE_RECEIPTS) {
      return;
    }

    if (aChatMsg.type !== MESSAGE_TYPE.RECEIPT) {
      this.logger('ERROR (handleReceipt): received non-receipt message.');
      return;
    }

    const receiptObj = aChatMsg.content;
    if (receiptObj) {
      // this.logger(`Processing receipt from ${aChatMsg.from}`);
      const recipientId = receiptObj.recipient;
      const receivedMsgIds = receiptObj.receivedMsgIds;
      const readMsgIds = receiptObj.readMsgIds;

      //   1. mark message objects in the conversation manager appropriately.
      let needsSave = false;

      const receivedMsgs =
        this.conversations.getSpecificMessages(recipientId, receivedMsgIds);
      for (const receivedMsg of receivedMsgs) {
        if ((receivedMsg.msgState !== MESSAGE_STATE.SEEN) ||
            (receivedMsg.msgState !== MESSAGE_STATE.RECEIVED)) {
          needsSave = true;
          this.conversations.markConversationModified(receivedMsg);
          receivedMsg.msgState = MESSAGE_STATE.RECEIVED;
        }
      }

      const readMsgs =
        this.conversations.getSpecificMessages(recipientId, readMsgIds);
      for (const readMsg of readMsgs) {
        if (readMsg.msgState !== MESSAGE_STATE.SEEN) {
          needsSave = true;
          this.conversations.markConversationModified(readMsg);
          readMsg.msgState = MESSAGE_STATE.SEEN;
        }
      }

      if (needsSave) {
        this._writeConversations();

        const ac = this.contactMgr.getActiveContact();
        const needsMsgListUpdate = ac && (recipientId === ac.id);
        if (needsMsgListUpdate) {
          this.updateMessages(recipientId);
        }
      }

      //   2. get the offline message service to delete any offline messages
      //      that have been read or received.
      let allMsgIds = [];
      if (receivedMsgIds) {
        allMsgIds = allMsgIds.concat(receivedMsgIds);
      }
      if (readMsgIds) {
        allMsgIds = allMsgIds.concat(readMsgIds);
      }
      const recipient = this.contactMgr.getContact(recipientId);
      this.offlineMsgSvc.deleteMessagesFromStorage(recipient, allMsgIds);
    }
  }

  sendRelayMessage(aChatMsg) {
    // Thoughts:
    //   * Autodiscovery is how people add to a relay.
    //     - if no autodiscovery for a user, consider the subscribe <id> command
    //       from a friend?
    //
    if (ENABLE_RELAY && isRelayId(aChatMsg.to)) {
      const msgContent = aChatMsg.content;
      if (msgContent === 'Relay: List Members') {
        const contactIds = this.contactMgr.getContactIds();
        let commandResponseMsg = `${this.userId} members: `;

        const length = contactIds.length;
        const lastContactIdx = length - 1;
        for (let idx = 0; idx < length; idx++) {
          const contactId = contactIds[idx];
          commandResponseMsg += `${contactId}`;
          if (idx !== lastContactIdx) {
            commandResponseMsg += ', ';
          }
        }

        const chatMsgTemplate = new ChatMessage();
        chatMsgTemplate.init(
          this.userId,
          undefined,
          this._getNewMessageId(),
          commandResponseMsg,
          Date.now());

        const commandDestinationIds = [ aChatMsg.from ]

        this.handleOutgoingRelayMessage(commandDestinationIds, chatMsgTemplate);

      } else if (msgContent === 'Relay: Unsubscribe') {
        // TODO: Send a confirmation message that we are unsubscribed.
      } else if (msgContent === 'Relay: Help') {
        // TODO: List the help commands.
      } else {
        // Relay:
        // Send the incoming message to all users except the sender.
        //
        const relayedMessage = `${aChatMsg.from} says:  ${aChatMsg.content}`;

        const chatMsgTemplate = new ChatMessage();
        chatMsgTemplate.init(
          this.userId,
          undefined,
          this._getNewMessageId(),
          relayedMessage,
          Date.now());

        const contactIds = this.contactMgr.getContactIds();
        const contactIdsMinusSender = contactIds.filter((contactId) => {
            return contactId !== aChatMsg.from;
          });

        // TODO: switch this back to contactIdsMinusSender (the immediate line below
        //       is only for debugging).
        // this.handleOutgoingRelayMessage(contactIds, chatMsgTemplate);
        this.handleOutgoingRelayMessage(contactIdsMinusSender, chatMsgTemplate);
      }
    }
  }

  addIncomingMessage(messages) {
    for (const message of messages) {
      this.conversations.addMessage(message);

      this.sendRelayMessage(message);
    }
    this._writeConversations();
  }

  updateContactOrderAndStatus(messages, writeContacts = true) {
    let updateActiveMsgs = false;
    const lastMsgIdxStr = `${messages.length-1}`;
    for (const idx in messages) {
      const message = messages[idx];
      const incomingId = message.from;

      // message.sent = true;

      // idx is a string representing the index (comparsion to length directly
      // fails since it's an int)
      const isLastOne = (idx == lastMsgIdxStr);
      const isActive = this.contactMgr.isActiveContactId(incomingId);

      this.contactMgr.setSummary(incomingId, message.content);

      if (isActive) {
        updateActiveMsgs = true;
        message.seen = true;
        message.msgState = MESSAGE_STATE.SEEN;
        this.conversations.markConversationModified(message);
      } else {
        this.contactMgr.incrementUnread(incomingId);
        const count = this.contactMgr.getAllUnread()
        if (!this.isMobile) {
          document.title = "(" + count + ") Stealthy | Decentralized Communication"
          this.notifyMe();  // TODO: PBJ is this non mobile only? (It calls window)
        }

      }

      if (isLastOne) {
        this.contactMgr.moveContactToTop(incomingId);
      }
    }

    if (updateActiveMsgs) {
      const activeId = this.contactMgr.getActiveContact() ?
        this.contactMgr.getActiveContact().id : undefined;
      this.updateMessages(activeId);
    }

    if (writeContacts) {
      this._writeContactList(this.contactMgr.getAllContacts());
    }

    this.updateContactMgr();
  }

  markReceivedMessagesSeen(aUserId) {
    let changesNeedSaving = false;
    const isSelf = (this.userId === aUserId);
    const chatMessages = this.conversations.getMessages(aUserId);

    const seenMessages = [];

    for (const chatMessage of chatMessages) {
      const received = (chatMessage.from !== this.userId) || isSelf;
      if (received && (chatMessage.msgState !== MESSAGE_STATE.SEEN)) {
        changesNeedSaving = true;
        this.conversations.markConversationModified(chatMessage);
        chatMessage.seen = true;
        chatMessage.msgState = MESSAGE_STATE.SEEN;
        seenMessages.push(chatMessage);
      }
    }

    if (changesNeedSaving) {
      this._writeConversations();
    }

    return seenMessages;
  }

  handleContactClick = (contact) => {
    if (!contact && !this.forceActiveContact) {
      this.contactMgr.setActiveContact(undefined);
      this.updateContactMgr()
      return
    }

    const selectedUserId = contact.id;
    if (this.contactMgr.isExistingContactId(selectedUserId)) {
      // TODO: need to send a packet back indicating messages seen.
      //       need offline solution to this too.
      // Mark sent messages as seen.
      // const chatMessages = this.conversations.getMessages(selectedUserId);
      // for (const chatMsg of chatMessages) {
      //   if (chatMsg.sent) {
      //     chatMsg.seen = true;
      //   }
      // }

      // TODO: predicate this by checking if unread is already zero ...
      this.contactMgr.setActiveContact(contact);
      // ACTODO: this method makes shit break...............
      this.contactMgr.clearUnread(selectedUserId);

      const seenMessages = this.markReceivedMessagesSeen(selectedUserId);
      this.sendMessageReceipts(seenMessages);

      this.updateContactMgr();
      this.updateMessages(selectedUserId);
    }
    // this.closeContactSearch();
  }

  _sendOutgoingMessageOffline(aChatMsg) {
    const outgoingUserId = aChatMsg.to;
    aChatMsg.msgState = MESSAGE_STATE.SENDING;
    const contact = this.contactMgr.getContact(outgoingUserId);
    this.offlineMsgSvc.sendMessage(contact, aChatMsg);
  }


  //
  //  I/O & Persistence
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  _writeContactList(aContactArr) {
    return utils.encryptObj(this.publicKey, aContactArr, ENCRYPT_CONTACTS)
    .then(contactsFileData => {
      return this.io.writeLocalFile(this.userId, 'contacts.json', contactsFileData)
      .then(() => {
        // TODO: get this event out of here--it shouldn't be tied to contact save,
        //       but rather to the event/code that was started by showAdd.
        // TODO: is this even needed?
        this.emit('me-close-add-ui');
        return
      })
      .catch((err) => {
        console.log(`ERROR(engine.js::_writeContactList): ${err}`)
        return
      })
    })
  }

  _writeConversations() {
    // TODO:
    // 1. call this less often
    return this.conversations.storeContactBundles()
    .then(() => {
      return
    })
    .catch((err) => {
      console.log(`ERROR(engine.js::_writeConversations): ${err}`)
      return
    })
  }

  writeSettings(theSettings) {
    if (theSettings === {} || theSettings === undefined) {
      theSettings = {
        time: Date.now()
      };
    }
    utils.encryptObj(this.publicKey, theSettings, ENCRYPT_SETTINGS)
    .then(settingsData => {
      this.io.writeLocalFile(this.userId, 'settings.json', settingsData);
    })
  }


  //
  //  Miscellany
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //

  // This method transforms engine formatted messages to gui formatted ones. TODO:
  // we should push this into the GUI or make the GUI work with the native format.
  _getMessageArray(aRecipientId) {
    const messages = [];

    if (aRecipientId) {
      const recipient = this.contactMgr.getContact(aRecipientId);
      const recipientImageUrl = (recipient) ? recipient.image : undefined;

      const chatMessages = this.conversations.getMessages(aRecipientId);
      for (const chatMessage of chatMessages) {
        const isMe = (chatMessage.from === this.userId);
        const message = {
          me: isMe,
          image: (isMe ? this.avatarUrl : recipientImageUrl),
          author: (isMe ? this.userId : aRecipientId),
          body: chatMessage.content,
          delivered: chatMessage.sent,
          seen: chatMessage.seen,
          time: chatMessage.time,
          state: chatMessage.msgState,
        };
        messages.push(message);
      }
    }

    return messages;
  }

  _getNewMessageId() {
    // Try this for now--it might be good enough.
    return Date.now();
  }

  _fetchPublicKey(aUserId) {
    return this.io.readRemoteFile(aUserId, 'pk.txt');
  }

  getAnonalytics() {
    return this.anonalytics;
  }
}
