const platform = require('platform');
// const firebase = require('firebase');
import firebase from 'react-native-firebase';

const EventEmitter = require('EventEmitter');
import EngineActions from '../Redux/EngineRedux'

import {
  NativeModules
} from 'react-native';


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
const common = require('./../common.js');

import chatIcon from './images/blue256.png';

const RELAY_IDS = [
  // 'relay.id',
  'relay.stealthy.id'
];

// Dev. constants not set in ctor:
const ENCRYPT_INDEXED_IO = true;

const ENABLE_RECEIPTS = true;
const ENABLE_RELAY = true;

// Bugs to Fix (temporary workarounds):
const WORKAROUND__DISABLE_REFLECTED_PACKET = true;

// Dev. "constants" now set in ctor based on user name--change them there, not here:
const DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR = undefined;
let ENABLE_GAIA = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;
let ENCRYPT_MESSAGES = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;
let ENCRYPT_CONTACTS = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;
let ENCRYPT_SETTINGS = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;
let STEALTHY_PAGE = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;

// Logging Scopes
const LOG_GAIAIO = true;
const LOG_OFFLINEMESSAGING = true;

const stealthyTestIds = [
  'pbj.id',
  'alexc.id',
  'relay.id',
  'stealthy.id',
  'braphaav.personal.id',
  'amplifier.steatlhy.id',
  'channel.stealthy.id',
  'echo.stealthy.id',
  'megaphone.stealthy.id',
  'relay.steatlhy.id',
  'repeater.stealthy.id',
]

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
              discoveryPath,
              sessionId,
              isMobile=false) {
    super();
    this.logger = logger;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.plugIn = plugIn;
    this.avatarUrl = avatarUrl;
    this.discoveryPath = discoveryPath;
    this.sessionId = sessionId;
    this.isMobile = isMobile;

    this.settings = {}
    this.contactMgr = undefined;

    this.myTimer = new Timer('Enter MessagingEngine Ctor');

    this.userId = undefined;

    this.conversations = undefined;
    this.offlineMsgSvc = undefined;
    this.io = undefined;
    this.shuttingDown = false;
    this.anonalytics = undefined;
  }

  // Convert node 'on' method to react 'addListener' method for RN EventEmitter
  on = (eventTypeStr, listenerFn, context) => {
    this.addListener(eventTypeStr, listenerFn, context);
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

  updateMessages(theMessages) {
    // console.log('updateMessages:')
    // console.log(`   active id:  ${this.contactMgr.getActiveContact().id}`)
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
      return;
    }

    this.userId = userId;

    this.setupDevelopmentConstants();

    this.myTimer.logEvent('Enter componentDidMountWork')

    // this.logger('Build Date: ', Config.BUILD_DATE_STAMP);
    // this.logger('Build Time: ', Config.BUILD_TIME_STAMP);
    // this.logger('Build Version: ', Config.BUILD_VERSION);

    if (!firebase.auth().currentUser) {
      firebase.auth().signInAnonymously()
      .then(() => {
        this._configureSessionManagement();
      });
    } else {
      this._configureSessionManagement();
    }
  }

  // Don't muck with this--it affects the WebPack HMR I believe (multiple timers
  // objects etc. if this is not here):
  componentWillUnmountWork() {
    this.logger('componentWillUnmountWork:');
    this.shuttingDown = true;

    this.offlineMsgSvc.stopSendService();
    this.offlineMsgSvc.stopRecvService();

    // Don't put anything below here in this fn--it's not guaranteed to be run
    // due to some issue tbd.
    // ------------------------------------------------------------------------

    // let deleteResolves = Promise.all(deletionPromises);

    // In UI make sure initWithFetchedData state becomes false.
  }

  //
  //  Initialization
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  setupDevelopmentConstants() {

    // const url = window.location.href;
    // if (url.indexOf('localhost') > -1) {
    //   STEALTHY_PAGE = 'LOCALHOST';
    // } else if (url.indexOf('test') > -1) {
    //   STEALTHY_PAGE = 'TEST_STEALTHY';
    // } else {
    //   STEALTHY_PAGE = 'STEALTHY';
    // }

    STEALTHY_PAGE = 'LOCALHOST'

    if (this.userId === 'pbj.id') {
      // PBJ Dev Settings:
      ENABLE_GAIA = true;
      ENCRYPT_MESSAGES = true;
      ENCRYPT_CONTACTS = true;
      ENCRYPT_SETTINGS = true;
    } else if ((this.userId === 'alexc.id') ||
               (this.userId === 'alex.stealthy.id') ||
               (this.userId === 'relay.id')) {
      // AC Dev Settings:
      ENABLE_GAIA = true;
      ENCRYPT_MESSAGES = true;
      ENCRYPT_CONTACTS = true;
      ENCRYPT_SETTINGS = true;
    } else {
      ENABLE_GAIA = true;
      ENCRYPT_MESSAGES = true;
      ENCRYPT_CONTACTS = true;
      ENCRYPT_SETTINGS = true;
    }
  }

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
        const newMessages = this._getMessageArray(ac.id);
        this.updateMessages(newMessages);
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

      const activeContact = this.contactMgr.getActiveContact();

      const seenMessages = this.markReceivedMessagesSeen(activeContact.id);
      this.sendMessageReceipts(seenMessages);

      const newMessages = this._getMessageArrayForContact(activeContact);

      // TODO: send these as a packet to the other user.

      this.offlineMsgSvc.startRecvService();

      // Update the summarys for all contacts. Redux makes it so that you have to
      // use a setter to fix this issue (setting the object property directly
      // doesn't work b/c it's read only).
      //   TODO: clean this up into method(s) on conversations and contactMgr (AC)
      const activeContactId = activeContact.id;
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

      this.updateMessages(newMessages);
      this.updateContactMgr();

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
    // Considerations:
    //   - TODO: throw if no firebase
    //   - TODO: what to save on loss of session lock key
    const ref = firebase.database().ref(common.getSessionRef(this.publicKey))
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

  _configureIO() {
    this.io = (ENABLE_GAIA) ?
      new GaiaIO(this.logger, LOG_GAIAIO) :
      new FirebaseIO(this.logger, firebase, STEALTHY_PAGE, LOG_GAIAIO);

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
          this.initSettings();
          this._fetchDataAndCompleteInit();
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

        this.initSettings();
        this._fetchDataAndCompleteInit();
      }
    })
    .catch((error) => {
      // TODO: Prabhaav--shouldn't this set the default settings from above?
      this.logger('Error', error);
      this.initSettings();
      this._fetchDataAndCompleteInit();
      this.logger('ERROR: Reading settings.');
    });
  }

  _fetchDataAndCompleteInit() {
    this.myTimer.logEvent('Enter _fetchDataAndCompleteInit')

    if (this.anonalytics === undefined) {
      this.anonalytics = new Anonalytics(this.userId);
      // this.anonalytics.setDatabase(firebase);
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
      // debugger
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
      // debugger
      this.logger('Error', error);
      this._initWithContacts([]);
      this.logger('ERROR: Reading contacts.');
    });
  }

  // TODO: rename this to something appropriate (i.e. update settings or
  //       something sensible for our api)
  initSettings() {
    this.emit('me-update-settings', this.settings);

    // TODO: refactor and cleanup alg. to work with failed discovery.
    if (process.env.NODE_ENV === 'production') {
      this.readContactDiscovery(this.settings.discovery);
    }
    else {
      if (stealthyTestIds.indexOf(this.userId) > -1) {
        this.readContactDiscovery(this.settings.discovery, true);
      }
    }
  }

  readContactDiscovery(discovery, development=false) {
    const id = this.userId.substring(0, this.userId.indexOf('.id'));
    const cleanId = id.replace(/_/g, '\.');
    let path = `/global/discovery/`;
    if (development) {
      path += `development/${cleanId}`
    }
    else {
      path += `${cleanId}`
    }
    if (discovery) {
      this.emit('me-add-discovery-contact', cleanId, path);
    }
  }

  writeContactDiscovery(contactId, publicKey, development=false) {
    const id = this.userId.substring(0, this.userId.indexOf('.id'));
    const cid = contactId.substring(0, contactId.indexOf('.id'));
    const cleanContactId = cid.replace(/\./g, '_');
    const cleanId = id.replace(/\./g, '_');
    let path = `/global/discovery/`;
    if (development) {
      path += `development/${cleanContactId}`
    }
    else {
      path += `${cleanContactId}`;
    }
    const ref = firebase.database().ref(`${path}/${cleanId}`);
    ref.once('value')
    .then((snapshot) => {
      if (!snapshot.val()) {
        ref.set({ status: 'pending' });
      }
    });
  }

  //
  //  Generic
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleShutDownRequest() {
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
  }

  //
  //  Contact Management
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleSearchSelect(contact) {
    let selectedUserId = contact.id;
    // Workaround for missing TLD on contact ids
    if (!selectedUserId.endsWith('.id')) {
      selectedUserId += '.id';
    }
    if (!this.contactMgr) {
      return;
    }

    const existingUserIds = this.contactMgr.getContactIds();

    let selfAddCheck = false;
    if (process.env.NODE_ENV === 'production' && selectedUserId !== 'alexc.id') {
      selfAddCheck = (selectedUserId === this.userId);
    }
    if (existingUserIds.includes(selectedUserId) || selfAddCheck) {
      this.contactMgr.setActiveContact(contact);
      this.updateContactMgr();
      this.closeContactSearch();
    } else {
      this.handleContactAdd(contact, selectedUserId);
    }
    this.emit('me-search-select-done', true);
  }

  handleContactAdd(contact, id, status = undefined) {
    if (this.anonalytics)
      this.anonalytics.aeContactAdded();

    this._fetchPublicKey(id)
    .then((publicKey) => {
      if (publicKey) {
        this.logger(`Adding contact ${id}. Read public key: ${publicKey}`);
      } else {
        this.logger(`Adding contact ${id}. UNABLE TO READ PUBLIC KEY`);
      }

      this.contactMgr.addNewContact(contact, id, publicKey);

      this._writeContactList(this.contactMgr.getContacts());

      this.conversations.createConversation(id);
      this._writeConversations();


      this.offlineMsgSvc.setContacts(this.contactMgr.getContacts());

      const newMessages = this._getMessageArray(id);
      this.updateContactMgr();
      this.updateMessages(newMessages);
      this.closeContactSearch();

      if (status) {
        const key = id.substring(0, id.indexOf('.id')).replace(/\./g, '_');
        const fbPath = utils.cleanPathForFirebase(`${this.discoveryPath}/${key}`);
        firebase.database().ref(fbPath).remove();
      }
    });
  }

  handleDeleteContact = (e, { contact }) => {
    this.contactMgr.deleteContact(contact);

    this._writeContactList(this.contactMgr.getAllContacts());

    this.conversations.removeConversation(contact.id);
    this._writeConversations();

    this.offlineMsgSvc.removeMessages(contact);

    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts());

    const activeUser = this.contactMgr.getActiveContact();
    let newMessages = []
    if (activeUser) {
      const activeUserId = activeUser.id;
      const newMessages = this._getMessageArray(activeUserId);
      this.contactMgr.clearUnread(activeUserId);
    }

    if (this.settings.discovery) {
      const key = contact.id.substring(0, contact.id.indexOf('.id')).replace(/\./g, '_');
      const fbPath = utils.cleanPathForFirebase(`${this.discoveryPath}/${key}`);
      firebase.database().ref(fbPath).remove();
    }

    this.updateContactMgr();
    this.updateMessages(newMessages);
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
      this.readContactDiscovery(!this.settings.discovery);
      this.settings.discovery = !this.settings.discovery;
      this.anonalytics.aeSettings(`discovery:${this.settings.discovery}`);
      if (this.settings.discovery) {
        if (process.env.NODE_ENV === 'production' || stealthyTestIds.indexOf(this.userId) > -1) {
          this.readContactDiscovery(this.settings.discovery);
        }
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

    const newMessages = this._getMessageArray(this.contactMgr.getActiveContact().id);
    this.updateMessages(newMessages);
  }

  handleOutgoingMessage = (text) => {
    const outgoingUserId = (this.contactMgr.getActiveContact()) ?
      this.contactMgr.getActiveContact().id : undefined;

    this.anonalytics.aeMessageSent();
    const chatMsg = new ChatMessage();
    chatMsg.init(
      this.userId,
      outgoingUserId,
      this._getNewMessageId(),
      text,
      Date.now());

    const outgoingPublicKey = this.contactMgr.getPublicKey(outgoingUserId);

    if (outgoingPublicKey) {
      this._sendOutgoingMessageOffline(chatMsg);
    } else {
      this._fetchPublicKey(outgoingUserId)
      .then((publicKey) => {
        if (publicKey) {
          this.logger(`Fetched publicKey for ${outgoingUserId}.`);

          this._sendOutgoingMessageOffline(chatMsg);

          this.contactMgr.setPublicKey(outgoingUserId, publicKey);
          this._writeContactList(this.contactMgr.getAllContacts());
          this.updateContactMgr();
        } else {
          this.logger(`Unable to fetch publicKey for ${outgoingUserId}. Cannot write response.`);
        }
      });
    }

    this.conversations.addMessage(chatMsg);
    this._writeConversations();

    this.contactMgr.moveContactToTop(outgoingUserId);
    this.contactMgr.setSummary(outgoingUserId, chatMsg.content);
    this._writeContactList(this.contactMgr.getAllContacts());
    this.updateContactMgr();

    const newMessages = this._getMessageArray(outgoingUserId);
    this.updateMessages(newMessages);
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
        const needsMsgListUpdate = (recipientId === ac.id);
        if (needsMsgListUpdate) {
          const newMessages = this._getMessageArray(ac.id);
          this.updateMessages(newMessages);
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
      const activeId = this.contactMgr.getActiveContact().id;
      const newMessages = this._getMessageArray(activeId);
      this.updateMessages(newMessages);
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

    const newMessages = this._getMessageArray(selectedUserId);

    this.updateContactMgr();
    this.updateMessages(newMessages);
    this.closeContactSearch();
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

  _getMessageArrayForContact(aContact) {
    if (aContact) {
      return this._getMessageArray(aContact.id);
    }
    return [];
  }

  // This method transforms engine formatted messages to gui formatted ones. TODO:
  // we should push this into the GUI or make the GUI work with the native format.
  _getMessageArray(aRecipientId) {
    const recipient = this.contactMgr.getContact(aRecipientId);
    const recipientImageUrl = (recipient) ? recipient.image : undefined;

    const messages = [];

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
