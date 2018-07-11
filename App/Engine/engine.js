const platform = require('platform');
// const firebase = require('firebase');
import firebase from 'react-native-firebase';
const adapter = require('webrtc-adapter');

const EventEmitter = require('EventEmitter');
import EngineActions from '../Redux/EngineRedux'

// const { getScreenConstraints,
//         getChromeExtensionStatus } = require('./ext/Screen-Capturing');
// import { requestScreenShare } from 'iframe-screenshare';

// TODO: something like rn-nodeify simple peer (existing problems though--naming
// goals, yarn etc.). See:
//    - https://www.npmjs.com/package/rn-nodeify
//    - https://github.com/feross/simple-peer/issues/109
//    - https://github.com/tradle/rn-nodeify
//    - https://github.com/philikon/ReactNativify
// const SimplePeer = require('simple-peer');
const SimplePeer = undefined;


// const Config = require('Config');

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
const { InvitationPolling,
        ResponsePolling } = require('./network/polling.js');
const { HeartBeat } = require('./network/heartBeat.js');
const SdpManager = require('./network/sdpManager.js');
const { ConnectionManager } = require('./network/connectionManager.js');
const { RESPONSE_TYPE,
        OFFER_TYPE,
        PEER_OBJ_TYPES } = require('./network/PeerManager.js');
const { getSimplePeerOpts } = require('./network/utils.js');

const { AVPeerMgr } = require('./network/avPeerMgr.js');

const constants = require('./misc/constants.js');
const statusIndicators = constants.statusIndicators;

const { ContactManager } = require('./messaging/contactManager.js');

import getQueryString from './misc/getQueryString';

const { Timer } = require('./misc/timer.js');
const { PeerManager } = require('./network/PeerManager.js');

const common = require('./../common.js');

import chatIcon from './images/blue256.png';

const RELAY_IDS = [
  // 'relay.id',
  'relay.stealthy.id'
];

const ENABLE_HEARTBEAT = false;

// Dev. constants not set in ctor:
const ENABLE_AUTOCONNECT = false;
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
let ENCRYPT_SDP = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;
let STEALTHY_PAGE = DONT_CHANGE_THIS_HERE_DO_IT_IN_THE_CTOR;

// Logging Scopes
const LOG_AUTOCONNECT = false;
const LOG_GAIAIO = false;
const LOG_INVITEPOLLING = false;
const LOG_RESPONSEPOLLING = false;
const LOG_OFFLINEMESSAGING = false;

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

const SHARED_STREAM_TYPES = {
  VIDEO: 0,
  AUDIO: 1,
  DESKTOP: 2
}

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
    this.sdpManager = undefined;
    this.connectionManager = undefined;
    this.invitePolling = undefined;
    this.peerMgr = new PeerManager(this.logger);
    this.invitations = [];   // TODO: Should probably be a Set (unique elements)
    this.io = undefined;
    this.heartBeat = undefined;
    this.avPeerMgr = undefined;
    this.shuttingDown = false;
    this.videoInviteChatMsg = undefined;
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

  startWebRtc() {
    this.logger('startWebRtc:');

    if (!utils.isDef(this.sdpManager)) {
      utils.throwIfUndef('userId', this.userId);
      utils.throwIfUndef('this.io', this.io);
      utils.throwIfUndef('this.anonalytics', this.anonalytics);

      this.sdpManager = new SdpManager(this.userId, this.io, this.anonalytics);
    }

    if (!utils.isDef(this.connectionManager)) {
      utils.throwIfUndef('this.anonalytics', this.anonalytics);

      this.connectionManager = new ConnectionManager(
        this.logger,
        this.sdpManager,
        this.anonalytics);

      this.connectionManager.on('new connection', (userId, peerObjType) => {
        this.handleNewConnection(userId, peerObjType);
      });

      this.connectionManager.on('incoming message', (userId, packet) => {
        this.handleIncomingMessage(userId, packet);
      });

      this.connectionManager.on('close connection', (userId, peerObjType) => {
        this.handleCloseConnection(userId, peerObjType);
      });
    }

    if (!utils.isDef(this.invitePolling)) {
      const userIds = this.contactMgr.getContactIds();
      this._initAndLaunchSdpInvitePolling(userIds);
    } else {
      this.invitePolling.pollForSdpInvitations();
    }

    this.invitePolling.on('received', (userId, sdpInvite) => {
      this._handleSdpInvite(userId, sdpInvite)
    });
  }

  stopWebRtc() {
    this.logger('stopWebrtc:');

    if (this.invitePolling) {
      this.invitePolling.stopPolling();
    }

    this.peerMgr.destroyPeers();

    if (this.sdpManager) {
      const deletionPromises = [];
      for (const contactId of this.contactMgr.getContactIds()) {
        deletionPromises.push(this.sdpManager.deleteSdpInvite(contactId));
        deletionPromises.push(this.sdpManager.deleteSdpResponse(contactId));
      }
    }

    for (const userId of this.contactMgr.getContactIds()) {
      const userStatus = this.peerMgr.isUserConnected(userId) ?
        statusIndicators.available : statusIndicators.offline;
      this.contactMgr.setStatus(userId, userStatus);
    }

    this.updateContactMgr();
  }

  // Don't muck with this--it affects the WebPack HMR I believe (multiple timers
  // objects etc. if this is not here):
  componentWillUnmountWork() {
    this.logger('componentWillUnmountWork:');
    this.shuttingDown = true;

    if (this.invitePolling) {
      this.invitePolling.stopPolling();
    }
    this.invitePolling = undefined;

    if (this.heartBeat) {
      this.heartBeat.stopBeat();
      this.heartBeat.stopMonitor();
    }
    this.heartBeat = undefined;

    this.peerMgr.destroyPeers();

    this.offlineMsgSvc.stopSendService();
    this.offlineMsgSvc.stopRecvService();

    // Don't put anything below here in this fn--it's not guaranteed to be run
    // due to some issue tbd.
    // ------------------------------------------------------------------------

    // Remove any invite & response JSON files outstanding.
    if (this.sdpManager) {
      const deletionPromises = [];
      for (const contactId of this.contactMgr.getContactIds()) {
        deletionPromises.push(this.sdpManager.deleteSdpInvite(contactId));
        deletionPromises.push(this.sdpManager.deleteSdpResponse(contactId));
      }
    }

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
      ENCRYPT_SDP = true;
    } else if ((this.userId === 'alexc.id') ||
               (this.userId === 'alex.stealthy.id') ||
               (this.userId === 'relay.id')) {
      // AC Dev Settings:
      ENABLE_GAIA = true;
      ENCRYPT_MESSAGES = true;
      ENCRYPT_CONTACTS = true;
      ENCRYPT_SETTINGS = true;
      ENCRYPT_SDP = true;
    } else {
      ENABLE_GAIA = true;
      ENCRYPT_MESSAGES = true;
      ENCRYPT_CONTACTS = true;
      ENCRYPT_SETTINGS = true;
      ENCRYPT_SDP = true;
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

    if (this.settings.webrtc) {
      const userIds = this.contactMgr.getContactIds();

      // TODO: can probably get rid of this conditional safely--with an empty
      //       list the promise will resolve similarly--just quicker? (AC)
      if (userIds.length === 0) {
        // New user or empty contact list.
        this.logger('Init & Launch Invite Polling:');
        this._initAndLaunchSdpInvitePolling(userIds);
        this.invitePolling.on('received', (userId, sdpInvite) => {
          this._handleSdpInvite(userId, sdpInvite)
        });
      } else {
        // Remove any old invites and responses before polling:
        //
        const deletionPromises = [];
        for (const contactId of userIds) {
          deletionPromises.push(this.sdpManager.deleteSdpInvite(contactId));
          deletionPromises.push(this.sdpManager.deleteSdpResponse(contactId));
        }
        Promise.all(deletionPromises)
        .then((values) => {
          // Initialize and launch the file based signaling system (polling):
          //
          this._initAndLaunchSdpInvitePolling(userIds);
          this.invitePolling.on('received', (userId, sdpInvite) => {
            this._handleSdpInvite(userId, sdpInvite)
          });
        });
      }
    }


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


    const heartbeatIoDriver = (ENABLE_GAIA) ?
      new GaiaIO(this.logger, LOG_GAIAIO) :
      new FirebaseIO(this.logger, firebase, STEALTHY_PAGE, LOG_GAIAIO);
    this.heartBeat = new HeartBeat(
      this.logger,
      heartbeatIoDriver,
      this.userId,
      this.contactMgr.getContacts());

    // Explicit scoping required to get correct this context in
    // _handleHeartBeatMonitor.
    this.heartBeat.on('monitor', (theHeartBeats) => {
      this._handleHeartBeatMonitor(theHeartBeats);
    });
    if (ENABLE_HEARTBEAT) {
      this.heartBeat.startBeat();
    }


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
          if (utils.isMobile) {
            // ignore WebRTC on mobile
            this.settings.webrtc = false;
          }

          this.initSettings();
          this._fetchDataAndCompleteInit();
        })
      } else {
        // THIS HAPPENS FIRST TIME ONLY
        // centralized discovery on by default
        this.logger('No data read from settings file. Initializing with default settings.');
        this.settings = {
          heartbeat: true,
          notifications: true,
          discovery: true,
          webrtc: !this.isMobile,
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

    // TODO: probably disable init of this with webrtc
    if (this.settings.webrtc) {
      this.sdpManager = new SdpManager(this.userId, this.io, this.anonalytics);
      this.connectionManager = new ConnectionManager(
        this.logger,
        this.sdpManager,
        this.anonalytics);

        this.connectionManager.on('new connection', (userId, peerObjType) => {
          this.handleNewConnection(userId, peerObjType);
        });

        this.connectionManager.on('incoming message', (userId, packet) => {
          this.handleIncomingMessage(userId, packet);
        });

        this.connectionManager.on('close connection', (userId, peerObjType) => {
          this.handleCloseConnection(userId, peerObjType);
        });
    }

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

    if (this.heartBeat) {
      this.heartBeat.stopBeat();
      this.heartBeat.stopMonitor();
    }

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

    // TODO: make this more intelligent (i.e. only delete if we issued an invite / response)
    // if (this.sdpManager) {
    //   for (const contactId of this.contactMgr.getContactIds()) {
    //     promises.push(this.sdpManager.deleteSdpInvite(contactId));
    //     promises.push(this.sdpManager.deleteSdpResponse(contactId));
    //   }
    // }
    // See also:  componentWillUnmountWork (TODO)

    Promise.all(promises)
    .then(() => {
      this.offlineMsgSvc = undefined
      this.heartbeat = undefined

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

    if (this.heartBeat) {
      this.heartBeat.writeHeartBeatFile();

      // TODO: Think about including this. If this method is getting called,
      //       we're in the background anyway so what's the point of getting
      //       the heartBeat files?
      //
      // this.heartBeat.readHeartBeatFiles();
    }

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

      if (this.settings.webrtc) {
        if (this.invitePolling) {
          this.invitePolling.updateContactIds(this.contactMgr.getContactIds());
        }
      }
      this._writeContactList(this.contactMgr.getContacts());


      // TODO(AC): probably change heartBeat to accept a contactMgr
      this.heartBeat.addContact(id, publicKey);


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

    if (this.settings.webrtc) {
      if (this.invitePolling) {
        this.invitePolling.updateContactIds(this.contactMgr.getContactIds());
      }
    }
    this._writeContactList(this.contactMgr.getAllContacts());

    this.conversations.removeConversation(contact.id);
    this._writeConversations();

    this.offlineMsgSvc.removeMessages(contact);

    this.peerMgr.removePeerAllTypes(contact.id);

    this.heartBeat.deleteContact(contact.id);

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
    } else if (name === 'heartbeat') {
      this.settings.heartbeat = !this.settings.heartbeat;
      // this.anonalytics.aeSettings(`passiveSearch:${this.settings.search}`);
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
    } else if (name === 'webrtc') {
      // if iOS, ignore user setting this for now
      if (!utils.is_iOS()) {
        this.settings.webrtc = !this.settings.webrtc;
        this.anonalytics.aeSettings(`webrtc:${this.settings.webrtc}`);
        if (!this.settings.webrtc) {
          try {
            this.stopWebRtc();
          } catch (err) {
            this.logger(`ERROR: Recommend restarting Stealthy. Problem encountered stopping WebRTC services.\n${err}\n`);
          }
        } else {
          try {
            this.startWebRtc();
          } catch (err) {
            this.logger(`ERROR: Recommend restarting Stealthy. Problem encountered starting WebRTC services.\n${err}\n`);
          }
        }
      }
    }

    this.emit('me-update-settings', this.settings);
    this.writeSettings(this.settings);
  }

  //
  //  Connectivity
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleNewConnection(newConnectionUserId, aPeerObjType) {
    this.myTimer.logEvent(`handleNewConnection ${newConnectionUserId}`);
    this.logger(this.myTimer.getEvents());

    this.logger(`New connection to ${newConnectionUserId}, ${aPeerObjType}!`);
    this.anonalytics.aeWebRtcConnectionEstablished();

    this.peerMgr.setPeerConnected(newConnectionUserId, aPeerObjType);

    // TODO: we'll need to test this given the re-write due to encryptObj being a promise
    const peerObj = this.peerMgr.getConnection(newConnectionUserId);
    if (peerObj) {
      const outgoingPublicKey = this.contactMgr.getPublicKey(newConnectionUserId);

      // TODO: need to check connections read messages before sending these unsent.
      //       If found, need to update our messge properties.
      //
      const unsentMessages = this.conversations.getUnsentMessages(newConnectionUserId);
      const sendPromises = []

      for (const message of unsentMessages) {
        const sendPromise = utils.encryptObj(outgoingPublicKey, message, ENCRYPT_MESSAGES)
                            .then(result => {
                              const packet = ENCRYPT_MESSAGES ? result : JSON.stringify(result)
                              message.sent = true
                              peerObj.send(packet)
                            })

        sendPromises.push(sendPromise)
      }

      // The wait for promise completion on write conversations is to ensure the
      // message.sent is registered in the persisted conversation
      //   TODO: need to check assumption that message.sent updates the conversation
      //         that is persisted.
      Promise.all(sendPromises)
      .then(() => {
        this._writeConversations();
      })
    } else {
      this.logger('Peer not connected in handleNewConnection.');
    }

    this.contactMgr.setStatus(newConnectionUserId, statusIndicators.available);
    this.updateContactMgr();
  }

  handleCloseConnection(closeConnectionId, aPeerObjType) {
    if (this.shuttingDown) {
      this.logger('Skipping handleCloseConnection.');
      return;
    }

    this.logger(`Closing connection to ${closeConnectionId}:`);
    // TODO: what type?
    this.peerMgr.removePeer(closeConnectionId, aPeerObjType);

    // Remove the invite or response file to prevent future issues (i.e. Reading
    // the invite again by accident or the response).
    if (this.sdpManager) {
      if (aPeerObjType === OFFER_TYPE) {
        this.sdpManager.deleteSdpInvite(closeConnectionId);
        this.logger(`Deleted SDP Invite for ${closeConnectionId}.`);
      } else {
        this.sdpManager.deleteSdpResponse(closeConnectionId);
        this.logger(`Deleted SDP Response for ${closeConnectionId}.`);
      }
    }

    // TODO: Look into if we still want this
    // Remove from active invite list (invitation failed--permits retry).
    if (aPeerObjType === OFFER_TYPE &&
        this.invitations.includes(closeConnectionId)) {
      const index = this.invitations.indexOf(closeConnectionId);
      if (index !== -1) {
        this.invitations.splice(index, 1);
      }
    }

    // Remove from polling exclusion list (i.e. if we're closing a response
    // peer obj, then start polling for invites again so we can issue a response.)
    if (aPeerObjType === RESPONSE_TYPE) {
      this.invitePolling.unexcludeUserId(closeConnectionId);
    }

    // Update the status indicators of the contacts array. (Must create
    // a new object or set state call will not result in a render).
    // TODO: refactor out status indicators into a dictionary to make
    //       this more efficient.
    if (!this.peerMgr.isUserConnected(closeConnectionId)) {
      this.contactMgr.setStatus(closeConnectionId, statusIndicators.offline);
      this.updateContactMgr();
    }
  }

  updateContactPubKeys() {
    // Check for heartbeat files not yet collected and update if found ...
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
              this.heartBeat.addContact(contactId, pk);
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

  _handleHeartBeatMonitor(theHeartBeats) {
    const currTimeMs = Date.now();

    for (const contact of this.contactMgr.getContacts()) {
      const contactId = contact.id;

      let timeStr = 'presence unknown.';
      const timeSinceOnlineMs = undefined;
      if ((contactId in theHeartBeats) && theHeartBeats[contactId]) {
        const timeSinceOnlineMs = currTimeMs - theHeartBeats[contactId].time;
        timeStr = ContactManager.getContactTimeStr(timeSinceOnlineMs);
      }
      this.contactMgr.setTime(contactId, timeStr);
      this.contactMgr.setTimeMs(contactId, timeSinceOnlineMs);
    }

    this.updateContactMgr();
    this.updateContactPubKeys();

    // TODO: refactor autoconnect out of here.
    //
    if (!ENABLE_AUTOCONNECT || !this.settings.webrtc) {
      return;
    }
    // Oh oh, what is this? Some Auto-connect hackery.
    const MAX_CONTACTS_PER_ITERATION = 10;
    this.log(LOG_AUTOCONNECT, '');
    this.log(LOG_AUTOCONNECT, 'AutoConnect v0.1');
    this.log(LOG_AUTOCONNECT, '...............................................................');
    let index = 0;
    const tooMuchTimeOffline = 3 * 60 * 1000;
    for (const contact of this.contactMgr.getContacts()) {
      const contactId = contact.id;
      if (index >= MAX_CONTACTS_PER_ITERATION) {
        break;
      }

      if (!(contactId in theHeartBeats) ||
          (theHeartBeats[contactId] === undefined)) {
        this.log(LOG_AUTOCONNECT, `Skipping ${contactId}, insufficient heartbeat data.`);
        continue;
      }

      if (this.invitations.includes(contactId)) {
        this.log(LOG_AUTOCONNECT, `Skipping ${contactId}, there is a pending invite for them.`);
        continue;
      }

      if (this.peerMgr.isUserConnected(contactId)) {
        this.log(LOG_AUTOCONNECT, `Skipping ${contactId}, they're connected.`);
        continue;
      }

      const timeSinceOnline = currTimeMs - theHeartBeats[contactId].time;
      if (timeSinceOnline > tooMuchTimeOffline) {
        const timeStr = ContactManager.getContactTimeStr(timeSinceOnline);
        this.log(LOG_AUTOCONNECT, `Skipping ${contactId}, they were ${timeStr}`);
        continue;
      }

      this.myTimer.logEvent(`AutoConnect Invite ${contactId}`);
      this._inviteUserToChat(contactId, contact.publicKey);
      index++;
    }
  }

  _inviteUserToChat(anOutgoingUserId, aPublicKey) {
    // Establish a connection to the user if possible and not already done:
    this.invitations.push(anOutgoingUserId);

    // TODO:
    //   1. Prevent a double click from clobbering/issuing two invites.
    //
    //
    this.logger(`   Sending SDP invite to ${anOutgoingUserId}`);
    const targetUserPublicKey = (ENCRYPT_SDP) ?
      aPublicKey : undefined;
    this.logger(`\n\n\nTARGET PUBLIC KEY ${targetUserPublicKey}, ENCRYPT_SDP=${ENCRYPT_SDP}`);

    // Send an SDP Invitation and poll for a response.
    const p = this.connectionManager.invite(anOutgoingUserId, targetUserPublicKey);

    const privateKey = (ENCRYPT_SDP) ? this.privateKey : undefined;
    const responsePolling = new ResponsePolling(
      this.logger, this.sdpManager, anOutgoingUserId, privateKey, LOG_RESPONSEPOLLING);
    // TODO: refactor to a separate handler (AC)
    responsePolling.pollForSdpResponse()
    .then((sdpResponse) => {
      if (this.settings.webrtc) {
        if (sdpResponse) {
          this.logger(`   Completing connection to ${anOutgoingUserId}`);

          p.signal(sdpResponse);
          this.peerMgr.addOfferPeer(anOutgoingUserId, p);

          // Remove from invite list (invitation is complete):
          const index = this.invitations.indexOf(anOutgoingUserId);
          if (index !== -1) {
            this.invitations.splice(index, 1);
          }
        } else {
          this.logger(`   SDP invite to ${anOutgoingUserId} was unsuccessful. Cancelling.`);
          p.destroy();
          // Don't thing we need to do more as the peer doesn't get added to Peer
          // Manager unless we get a response.
        }
      } else {
        // Peer manager was disabled--likely to stop WebRTC -- destroy our peer
        // and move on.
        this.logger(`   SDP invite to ${anOutgoingUserId} ignored. WebRTC disabled.`);
        p.destroy();
      }
    });
  }

  _initAndLaunchSdpInvitePolling(userIds) {
    this.myTimer.logEvent('Enter _initAndLaunchSdpInvitePolling')

    const privateKey = (ENCRYPT_SDP) ? this.privateKey : undefined;
    this.invitePolling = new InvitationPolling(
      this.logger, this.sdpManager, userIds, privateKey, LOG_INVITEPOLLING);
    this.invitePolling.pollForSdpInvitations();
  }

  _handleSdpInvite(userId, sdpInvite) {
    this.myTimer.logEvent(`_handleSdpInvite ${userId}`);
    const targetUserPublicKey = this.contactMgr.getPublicKey(userId);

    if (targetUserPublicKey) {
      this._initiateSdpResponse(userId, targetUserPublicKey, sdpInvite);
    } else {
      this._fetchPublicKey(userId)
      .then((publicKey) => {
        if (publicKey) {
          this.logger(`Fetched publicKey for ${userId}.`);
          this._initiateSdpResponse(userId, publicKey, sdpInvite);

          this.contactMgr.setPublicKey(userId, publicKey);
          this._writeContactList(this.contactMgr.getAllContacts());
          this.updateContactMgr();
        } else {
          this.logger(`Unable to fetch publicKey for ${userId}. Cannot write response.`);
        }
      });
    }
  }

  _initiateSdpResponse(aTargetUserId, aTargetUserPublicKey, anSdpInvite) {
    this.myTimer.logEvent(`_initiateSdpResponse ${aTargetUserId}`);

    const targetUserPublicKey = (ENCRYPT_SDP) ? aTargetUserPublicKey : undefined;

    const peerObj = this.connectionManager.respond(
      anSdpInvite, aTargetUserId, targetUserPublicKey);
    if (peerObj) {
      this.peerMgr.addResponsePeer(aTargetUserId, peerObj);
      this.invitePolling.excludeUserId(aTargetUserId);
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
        if (this.peerMgr.isUserConnected(outgoingUserId)) {
          this._sendOutgoingMessage(outgoingUserId, chatMsg, outgoingPublicKey);
        } else {
          this._sendOutgoingMessageOffline(chatMsg);

          if ((!this.invitations.includes(outgoingUserId)) && this.settings.webrtc ) {
            this._inviteUserToChat(outgoingUserId, outgoingPublicKey);
          }
        }
      } else {
        this._fetchPublicKey(outgoingUserId)
        .then((publicKey) => {
          if (publicKey) {
            this.contactMgr.setPublicKey(outgoingUserId, publicKey);
            this._writeContactList(this.contactMgr.getAllContacts());
            this.updateContactMgr();

            this.logger(`Fetched publicKey for ${outgoingUserId}.`);

            if (this.peerMgr.isUserConnected(outgoingUserId)) {
              this._sendOutgoingMessage(outgoingUserId, chatMsg, publicKey);
            } else {
              this._sendOutgoingMessageOffline(chatMsg);

              if ((!this.invitations.includes(outgoingUserId)) && this.settings.webrtc ) {
                this._inviteUserToChat(outgoingUserId, publicKey);
              }
            }
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
      if (this.peerMgr.isUserConnected(outgoingUserId)) {
        this._sendOutgoingMessage(outgoingUserId, chatMsg, outgoingPublicKey);
      } else {
        this._sendOutgoingMessageOffline(chatMsg);

        if ((!this.invitations.includes(outgoingUserId)) && this.settings.webrtc ) {
          this._inviteUserToChat(outgoingUserId, outgoingPublicKey);
        }
      }
    } else {
      this._fetchPublicKey(outgoingUserId)
      .then((publicKey) => {
        if (publicKey) {
          this.logger(`Fetched publicKey for ${outgoingUserId}.`);

          if (this.peerMgr.isUserConnected(outgoingUserId)) {
            this._sendOutgoingMessage(outgoingUserId, chatMsg, publicKey);
          } else {
            this._sendOutgoingMessageOffline(chatMsg);

            if ((!this.invitations.includes(outgoingUserId)) && this.settings.webrtc ) {
              this._inviteUserToChat(outgoingUserId, publicKey);
            }
          }

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

  // Might need to rethink this as it can probably get called multiple times
  // concurrently (TODO: AC - think about queuing new packets for processing)
  handleIncomingMessage(incomingUserId, packet) {
    utils.decryptObj(this.privateKey, packet, ENCRYPT_MESSAGES)
    .then(result => {
      const chatMsg = ENCRYPT_MESSAGES ? result : JSON.parse(result)

      if (chatMsg && (chatMsg.type === MESSAGE_TYPE.VIDEO_SDP)) {
        this.logger(`Received VIDEO_SDP message from ${chatMsg.from}.`);
        // TODO: what if we're already video chatting ...
        if (chatMsg.content.type === 'offer') {
          // Pops a dialog asking user if yes/no on video invite.
          //   - If yes, calls handleVideoOpen, which requires that chatMsg is
          //     assigned to a member (shitty way to pass it).
          //   - If no, calls handleVideoInviteClose, which should unassign the
          //     member, and ideally TODO, send a response to the invitee that
          //     there call was rejected.
          this.videoInviteChatMsg = chatMsg;
          this.emit('me-request-video');
        } else {
          this.handleVideoResponse(chatMsg);
        }
        return;
      } else if (chatMsg && (chatMsg.type === MESSAGE_TYPE.SCREEN_SHARE_SDP)) {
        this.logger(`Received SCREEN_SHARE_SDP message from ${chatMsg.from}.`);
        // TODO: what if we're already video chatting ...
        if (chatMsg.content.type === 'offer') {
          // Pops a dialog asking user if yes/no on video invite.
          //   - If yes, calls handleVideoOpen, which requires that chatMsg is
          //     assigned to a member (shitty way to pass it).
          //   - If no, calls handleVideoInviteClose, which should unassign the
          //     member, and ideally TODO, send a response to the invitee that
          //     there call was rejected.
          this.videoInviteChatMsg = chatMsg;
          // this.emit('me-request-video');
          this.handleScreenShareInviteOpen();
        } else {
          // this.handleVideoResponse(chatMsg);
          this.handleScreenShareResponse(chatMsg);
        }
        return;
      } else if (chatMsg && (chatMsg.type === MESSAGE_TYPE.RECEIPT)) {
        this.logger(`Received RECEIPT message from ${chatMsg.from}.`);
        this.handleReceipt(chatMsg);
        return;
      }

      // TODO TODO TODO: Fix this workaround--suspect it'r reflected messaging bug
      //                 from the duplex peer manager.
      if (chatMsg && WORKAROUND__DISABLE_REFLECTED_PACKET) {
        const isSelf = (chatMsg.to === chatMsg.from);
        if (!isSelf) {
          if (chatMsg.from === this.userId) {
            // Discard handling this message for now.
            return;
          }
        }
      }

      const messages = [chatMsg];
      this.addIncomingMessage(messages);
      this.updateContactOrderAndStatus(messages);
      this.sendMessageReceipts(messages);

    })
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

        if (this.peerMgr.isUserConnected(destId)) {
          this._sendOutgoingMessage(destId, receiptMsg, destPublicKey);
        } else {
          this._sendOutgoingMessageOffline(receiptMsg);
        }
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

  _sendOutgoingMessage(anOutgoingUserId, aChatMsg, aPublicKey) {
    aChatMsg.sent = true;
    aChatMsg.msgState = MESSAGE_STATE.SENT_REALTIME;

    utils.encryptObj(aPublicKey, aChatMsg, ENCRYPT_MESSAGES)
    .then(result => {
      let packet = ENCRYPT_MESSAGES ? result : JSON.stringify(result)
      this.peerMgr.getConnection(anOutgoingUserId).send(packet);
    })

    if (this.settings.discovery) {
      if (process.env.NODE_ENV === 'production') {
        this.writeContactDiscovery(anOutgoingUserId, aPublicKey);
      }
      else {
        if (stealthyTestIds.indexOf(this.userId) > -1) {
          this.writeContactDiscovery(anOutgoingUserId, aPublicKey, true);
        }
      }
    }
  }

  _sendOutgoingMessageOffline(aChatMsg) {
    const outgoingUserId = aChatMsg.to;
    aChatMsg.msgState = MESSAGE_STATE.SENDING;
    const contact = this.contactMgr.getContact(outgoingUserId);
    this.offlineMsgSvc.sendMessage(contact, aChatMsg);
  }


  //
  //  Audio / Video P2P
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  createAVPeer(stream, aMsgType = MESSAGE_TYPE.VIDEO_SDP) {
    const simplePeerOpts =
      getSimplePeerOpts(this.avPeerMgr.isInitiator(), { stream });
    const peerObj = SimplePeer(simplePeerOpts);
    this.avPeerMgr.setPeerObj(peerObj);

    peerObj.on('signal', (sdpData) => {
      this.logger('Video Peer Signal callback.');
      // TODO: this could probably be shared with handleOutgoingMessage in some ways.
      const outgoingId = this.avPeerMgr.getTargetId();
      const outgoingPublicKey =
        this.contactMgr.getPublicKey(outgoingId);

      const chatMsg = new ChatMessage();
      chatMsg.init(
        this.avPeerMgr.getUserId(),
         outgoingId,
        this._getNewMessageId(),
        sdpData,
        Date.now(),
        aMsgType);
      chatMsg.sent = true;

      utils.encryptObj(outgoingPublicKey, chatMsg, ENCRYPT_MESSAGES)
      .then(result => {
        let packet = ENCRYPT_MESSAGES ? result : JSON.stringify(result)

        this.logger(`Sending video invite request chatMsg to ${outgoingId}.`);
        this.peerMgr.getConnection(outgoingId).send(packet);
      })
    });

    if (!(this.avPeerMgr.isSelf() && this.avPeerMgr.isInitiator())) {
      peerObj.on('stream', (stream) => {
        const video = document.querySelector('video');
        try {
          video.srcObject = stream;
        } catch (error) {
          video.src = window.URL.createObjectURL(stream);
        }
        video.play();
      });
    }

    if (!this.avPeerMgr.isInitiator()) {
      peerObj.signal(this.avPeerMgr.getSdpInvite());
    }

    peerObj.on('close', () => {
      this.logger('Closing Video / Audio p2p session.');
      this.handleVideoClose();
    });

    peerObj.on('error', (err) => {
      this.logger(`ERROR: Video / Audio p2p session. ${err}.`);
      this.anonalytics.aeAVWebRtcError(`${err}`)
      this.handleVideoClose();
    });
  }

  _handleStreamShare(aStreamType) {
    utils.throwIfUndef('aStreamType', aStreamType);

    if (this.avPeerMgr) {
      this.logger('INFO(_handleStreamShare): Stream request ignored, session in progress.');
      return;
    }

    const targetId = this.contactMgr.getActiveContact().id;
    if (!this.peerMgr.isUserConnected(targetId)) {
      this.logger(`INFO(_handleStreamShare): Stream request ignored. Realtime connection to ${targetId} required.`);
      return;
    }

    if (!this.videoInviteChatMsg) {
      // TODO: need to error here if video is already open (can't be initiator and
      //       open video twice).

      // This happens if you are the initiator:
      this.avPeerMgr = new AVPeerMgr(this.userId, targetId, true);
      this._openMedia(aStreamType);
    } else {
      // This happens if you are the recipient
      this.handleVideoInvite(this.videoInviteChatMsg);
      this.videoInviteChatMsg = undefined;  // Clear for next time.
    }
  }

  handleShareDesktopOpen() {
    this._handleStreamShare(SHARED_STREAM_TYPES.DESKTOP);
  }

  handleVideoOpen() {
    this.anonalytics.aeVideoChatButton();
    this._handleStreamShare(SHARED_STREAM_TYPES.VIDEO);
  }

  handleShareDesktopClose() {
    if (this.avPeerMgr) {
      this.avPeerMgr.close();
      this.avPeerMgr = undefined;
    }
    this.videoInviteChatMsg = undefined;  // Clear for next time.
  }

  handleVideoInvite(aChatMsg) {
    if (this.avPeerMgr && this.avPeerMgr.isSelf()) {
      this.avPeerMgr.setInitiator(false);
      this.avPeerMgr.setSdpInvite(aChatMsg.content);
      this.createAVPeer(undefined);
    } else if (this.avPeerMgr && this.avPeerMgr.isInitiator()) {
      this.logger('INFO(handleVideoInvite): Video chat request ignored while video chat session is already being negotiated / in progress.');
    } else {
      this.avPeerMgr = new AVPeerMgr(this.userId, aChatMsg.from, false);
      this.avPeerMgr.setSdpInvite(aChatMsg.content);
      this._openMedia(SHARED_STREAM_TYPES.VIDEO);
    }
  }

  handleVideoResponse(aChatMsg) {
    this.avPeerMgr.setSdpResponse(aChatMsg.content);
    this.avPeerMgr.getPeerObjInitiator().signal(this.avPeerMgr.getSdpResponse());
  }

  handleVideoClose() {
    if (this.avPeerMgr) {
      this.avPeerMgr.close();
      this.avPeerMgr = undefined;
    }
    this.videoInviteChatMsg = undefined;  // Clear for next time.
  }

  _startStreaming(theConstraints, aMsgType) {
    navigator.mediaDevices.getUserMedia(theConstraints)
    .then((stream) => {
      // Code to debug local (comment out code below it):
      //
      // this.emit('me-show-video');
      // const video = document.querySelector('video');
      // try {
      //   video.srcObject = stream;
      // } catch (error) {
      //   video.src = window.URL.createObjectURL(stream);
      // }
      // video.play();

      this.avPeerMgr.setStream(stream);
      this.createAVPeer(stream, aMsgType);
      this.emit('me-show-video');
    })
    .catch((error) => {
      this.handleVideoClose();
      this.logger(`ERROR: An error occured accessing media: ${error}`);
    });
  }

  _openMedia(aStreamType) {
    switch (aStreamType) {

      case SHARED_STREAM_TYPES.AUDIO:
        // TODO:
        break;

      case SHARED_STREAM_TYPES.VIDEO:
        const constraints = {
          video: true,
          audio: true
        }
        this._startStreaming(constraints, MESSAGE_TYPE.VIDEO_SDP);
        break;

      case SHARED_STREAM_TYPES.DESKTOP:
        // let res = requestScreenShare()

        // getChromeExtensionStatus((status) => {
        //   this.logger(`INFO: Chrome extension status = ${status}`)
        //   switch (status) {
        //     case 'not-chrome':
        //     case 'installed-enabled':
        //       // Do nothing, run getScreenConstraints.
        //       break;
        //     case 'installed-disabled':
        //       let showMeThePlugin = confirm(
        //         "The Stealthy Screen Chrome Plugin must be enabled to share your desktop. " +
        //         "Would you like to do that now?");

        //       if (showMeThePlugin) {
        //         window.open('//chrome://extensions/?id=ololhidlkciconhglnndlojapdiklgha', '_blank');
        //       }
        //       this.handleVideoClose();
        //       return;
        //     case 'not-installed':
        //       let installThePlugin = confirm(
        //         "The Stealthy Screen Chrome Plugin must be installed to share your desktop. " +
        //         "Would you like to do that now?");

        //       if (installThePlugin) {
        //         window.open('https://chrome.google.com/webstore/detail/stealthy-screen/ololhidlkciconhglnndlojapdiklgha', '_blank');
        //       }
        //       this.handleVideoClose();
        //       return;
        //     default:

        //   }

        //   getScreenConstraints((error, screen_constraints) => {
        //     if (error) {
        //       this.handleVideoClose();
        //       return alert(error);
        //     }
        //     const constraints = {
        //       video: screen_constraints,
        //       // audio: true
        //     }
        //     // TODO: make this use screen share
        //     // this._startStreaming(constraints, MESSAGE_TYPE.SCREEN_SHARE_SDP);
        //     this._startStreaming(constraints, MESSAGE_TYPE.VIDEO_SDP);
        //   });
        // });
        break;
      default:
        throw 'ERROR: unrecognized stream type for sharing.'
    }
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

  clearVideoInviteChatMsg() {
    this.videoInviteChatMsg = undefined;
  }
}
