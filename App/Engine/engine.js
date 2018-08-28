const platform = require('platform');
const { firebaseInstance } = require('./firebaseWrapper.js')

const { EventEmitterAdapter } = require('./platform/reactNative/eventEmitterAdapter.js')
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

const { ContactManager } = require('./messaging/contactManager.js');

const { Discovery } = require('./misc/discovery.js')

const { Graphite } = require('./integrations/graphite.js')
const { StealthyIndexReader } = require('./integrations/stealthyIndexReader.js')

const common = require('./../common.js');

import API from './../Services/Api'
const api = API.create()

//
const ENCRYPT_INDEXED_IO = true;
//
const ENABLE_RECEIPTS = true;
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

export class MessagingEngine extends EventEmitterAdapter {
  constructor(logger,
              privateKey,
              publicKey,
              avatarUrl,
              sessionId) {
    super();
    this.logger = logger;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.avatarUrl = avatarUrl;
    this.sessionId = sessionId;
    this.discovery = undefined;

    this.settings = constants.defaultSettings
    this.contactMgr = undefined;

    this.userId = undefined;

    this.conversations = undefined;
    this.offlineMsgSvc = undefined;
    this.io = undefined;
    this.shuttingDown = false;
    this.anonalytics = undefined;

    this.indexIntegrations = {}

    // This member determines behavior on read failures (prevents data loss
    // from clobbering write on failure)
    this.newUser = undefined
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

    // In mobile we don't force an active contact
    const forceActiveContact = false
    const contactMgr = new ContactManager(forceActiveContact);
    contactMgr.clone(this.contactMgr);

    this.emit('me-update-contactmgr', contactMgr);
  }

  updateMessages(aContactId) {
    const theMessages = this._getMessageArray(aContactId);
    this.emit('me-update-messages', theMessages);
  }

  closeContactSearch() {
    this.emit('me-close-contact-search', true);
  }

  //
  // API Integration Interface
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  // Events to listen for:
  //    me-integration-data <appName> <error> <indexData>

  // Returns the current integration data for specified appName and issues an
  // me-integration-data event.
  getIntegrationData(appName = 'Graphite') {
    // const method = 'engine.js::getIntegrationData'
    // let error = undefined
    // let indexData = undefined
    //
    // if (!appName) {
    //   error = `ERROR(${method}): appName is not defined.`
    // } else if (!this.indexIntegrations ||
    //            !this.indexIntegrations.hasOwnProperty(appName)) {
    //   error = `ERROR(${method}): no integration for ${appName} available.`
    // }
    //
    // if (!error) {
    //   indexData = {}
    //   indexData[appName] = this.indexIntegrations[appName].getIndexData()
    // }
    //
    // this.emit('me-integration-data', appName, error, indexData)
  }

  // Updates integration data for specified appName and issues an me-integration-data
  // event on completion.
  async refreshIntegrationData(appName = 'Graphite') {
    const method = 'engine.js::refreshIntegrationData'
    let error = undefined
    let indexData = undefined

    if (!appName) {
      error = `ERROR(${method}): appName is not defined.`
    } else if (!this.indexIntegrations ||
               !this.indexIntegrations.hasOwnProperty(appName)) {
      error = `ERROR(${method}): no integration for ${appName} available.`
    }

    if (!error) {
      const integration = this.indexIntegrations[appName]
      try {
        const result = await integration.readIndexData()
        indexData = {}
        indexData[appName] = result
      } catch (integrationError) {
        error = integrationError
      }
    }

    this.emit('me-integration-data', appName, error, indexData)
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

    this.userId = userId;
    this._configureSessionManagement()
  }

  //
  //  Initialization
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  async _initWithContacts(contactArr) {
    // In mobile we don't force an active contact
    const forceActiveContact = false
    this.contactMgr = new ContactManager(forceActiveContact);
    this.contactMgr.initFromStoredArray(contactArr);
    this.contactMgr.setAllContactsStatus();
    if (!forceActiveContact) {
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
          if (((message.type === MESSAGE_TYPE.TEXT) ||
               (message.type === MESSAGE_TYPE.TEXT_JSON)) &&
              !this.conversations.hasMessage(message)) {
            unreceivedMessages.push(message);
          } else if (message.type === MESSAGE_TYPE.RECEIPT) {
            this.handleReceipt(message);
          }
        }
      }

      this.addIncomingMessages(unreceivedMessages);
      this.updateContactOrderAndStatus(unreceivedMessages);
      this.sendMessageReceipts(unreceivedMessages);
    });

    this.offlineMsgSvc.on('offline messages sent', () => {
      // The offline service has sent messages and updated their status.
      // We want to do a redraw of the current message window to update
      // status indicators (spinners--> solid gray checkmarks) and perform
      // a bundle write to store the change.
      this._writeConversations();

      if (this.contactMgr.getActiveContact()) {
        this.updateMessages(this.contactMgr.getActiveContact().id)
      }
    });


    // Lots of possiblities here (i.e. lazy load etc.)
    this.conversations = new ConversationManager(this.logger, this.userId, this.idxIo);

    try {
      await this.conversations.loadContactBundles(this.contactMgr.getContactIds())
    } catch (error1) {
      // TODO: look at some alternatives to this heavy handed approach:
      //   1. retry the load
      //   2. mark the contact as unloaded to be retried later
      //        - add a refresh / load cycle to the engine
      //
      // For now we do an inelegant reload attempt befor fail.
      // TODO: a more elegant retry mechanism--see notes for _writeConversations
      //
      if (!this.newUser) {
        try {
          await this.conversations.loadContactBundles(this.contactMgr.getContactIds())
        } catch (error2) {
          try {
            await this.conversations.loadContactBundles(this.contactMgr.getContactIds())
          } catch (error3) {
            const errMsg = `ERROR(${method}): failure to fetch contacts from GAIA. Try again soon.\n${error3}`
            this.emit('me-fault', errMsg)
            throw errMsg
          }
        }
      }
    }

    // TODO TODO TODO:  change this to be an emitter that sends the ids of sent
    //                  messages back to the engine so we don't have to make
    //                  a conversations ref in offlineMsgSvc
    this.offlineMsgSvc.setConversationManager(this.conversations);

    let activeContactId = undefined
    if (this.contactMgr.getActiveContact()) {
      activeContactId = this.contactMgr.getActiveContact().id
      const seenMessages = this.markReceivedMessagesSeen(activeContactId);
      this.sendMessageReceipts(seenMessages);
    }

    this.offlineMsgSvc.startRecvService();


    // Update the summaries for all contacts.
    //   TODO: clean this up into method(s) on conversations and contactMgr (AC)
    for (const contactId of this.contactMgr.getContactIds()) {
      const messages = this.conversations.getMessages(contactId);

      const lastMessage = (messages && (messages.length > 0)) ?
        ChatMessage.getSummary(messages[messages.length - 1]) : '';
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


    // Setup Discovery services:
    if (this.settings.discovery) {
      this.discovery = new Discovery(this.userId, this.publicKey, this.privateKey)
      this.discovery.on('new-invitation',
                        (theirPublicKey, theirUserId) =>
                          this.handleContactInvitation(theirPublicKey, theirUserId))

      this.discovery.monitorInvitations()
    }


    // Indicate to FB that we've completed init and are no longer a first time user
    // (used to handle IO errors specially)
    const dbExistingDataPath = common.getDbExistingDataPath(this.publicKey)
    const dbExistingDataPathRef = firebaseInstance.getFirebaseRef(dbExistingDataPath)
    dbExistingDataPathRef.set('true')

    this.emit('me-initialized', true)


    // Integrations load on start in the background. Might need to queue these and
    // add a busy/working block to prevent multiple read requests:
    const graphiteIntegration = new Graphite(this.io, this.userId, this.privateKey)
    this.indexIntegrations['Graphite'] = graphiteIntegration
    //
    const travelStackIntegration = new StealthyIndexReader(
      this.userId, this.privateKey, this.io, 'https://app.travelstack.club')
    this.indexIntegrations['Travelstack'] = travelStackIntegration

    this.refreshIntegrationData('Graphite')
    this.refreshIntegrationData('Travelstack')
  }

  async _configureSessionManagement() {
    const method = 'engine.js::_configureSessionManagement'
    // Notes: The session is set in the UI before the engine even loads. It is
    //        an error / fault if the session is not fetchable or if it is the
    //        common value for no session (common.NO_SESSION).  Throw to prevent
    //        the engine froms starting if an error / fault is detected.
    //
    const ref = firebaseInstance.getFirebaseRef(common.getDbSessionPath(this.publicKey))
    let snapshot = undefined
    try {
      snapshot = await ref.once('value')
    } catch (err) {
      throw `ERROR(${method}): Unable to access session manager.`
    }

    if (!snapshot || !snapshot.exists() || (snapshot.val() === common.NO_SESSION)) {
      throw `ERROR(${method}): Unable to acquire session.`
    }

    this.logger(`INFO(${method}): session = ${snapshot.val()}.`)
    await this._configureIO()
  }

  async _configureIO() {
    this.io = (ENABLE_GAIA) ?
      new GaiaIO(this.logger, LOG_GAIAIO) :
      new FirebaseIO(this.logger, STEALTHY_PAGE, LOG_GAIAIO);

    await this._fetchUserSettings();
  }

  // Future: a multiple read of settings.json, contacts.json and pk.txt
  //         and a majority test to see if first time user (i.e. if not firebase
  //         and all three null/not present, then decide first time user)
  async _fetchUserSettings() {
    // Begin TODO TODO TODO remove this when everything works in Android
    //
    // Basic single file to root encrypt decrypt read write test:
    // -------------------------------------------------------------------------
    // try {
    //   console.log('before encrypting settings')
    //   const encSettings = await utils.encryptObj(this.publicKey, this.settings, ENCRYPT_SETTINGS)
    //   console.log('after encrypting settings')
    //
    //   console.log('before writing encrypted settings')
    //   await this.io.writeLocalFile(this.userId, 'settings.json', encSettings)
    //   console.log('after writing encrypted settings')
    // } catch (error) {
    //   console.log(`error after encrypting or writing encrypted settings.json ${error}`)
    // }
    //
    // let encryptSettingsData = undefined
    // try {
    //   console.log('before read settings.json')
    //   encryptSettingsData = await this.io.readLocalFile(this.userId, 'settings.json')
    //   console.log('after read settings.json')
    //
    //   console.log('before decrypting settings')
    //   const recovered = await utils.decryptObj(this.privateKey, encryptSettingsData, ENCRYPT_SETTINGS)
    //   conole.log(`After decryption, recovered: ${recovered}`)
    //   // readLocalFile returns undefined on BlobNotFound, so set new user:
    // } catch (error) {
    //   console.log(`error after read settings.json: ${error}`)
    // }
    //
    //
    // console.log('exiting _fetchUserSettings')
    //
    // return
    //
    // indexedIO file test:
    // -------------------------------------------------------------------------
    // let idxIo = new IndexedIO(this.logger, this.io, this.userId,
    //                           this.privateKey, this.publicKey, ENCRYPT_INDEXED_IO);
    // const testData = {
    //   paddington: true,
    //   smurfs: true,
    //   'he-man': false
    // }
    // const dirPath = 'test012345678'
    // const testPath = `${dirPath}/testData.ejson`
    // console.log('starting index writeLocalFile test')
    // try {
    //   await idxIo.writeLocalFile(testPath, testData)
    // } catch (error) {
    //   console.log(`ERROR(engine::_fetchUserSettings): failed writing ${testPath} to ${this.userId}'s gaia.\n${error}`)
    // }
    // console.log('done')
    //
    // const testPath2 = `${dirPath}/testData2.ejson`
    // try {
    //   await idxIo.seqWriteLocalFile(testPath2, testData, this.publicKey)
    // } catch (error) {
    //   console.log(`ERROR(engine::_fetchUserSettings): failed writing ${testPath} to ${this.userId}'s gaia.\n${error}`)
    // }
    //
    // try {
    //   const indexData = await idxIo.readLocalIndex(dirPath)
    //   const emptyIndexData = await idxIo.readLocalIndex('indexDoesntExist')
    //
    //   await idxIo.deleteLocalFile(testPath2, this.publicKey)
    //   const updatedIndexData = await idxIo.readLocalIndex(dirPath)
    //
    //   console.log('before remote index read test')
    //   const updatedSharedIndexData = await idxIo.readRemoteIndex(this.userId, dirPath)
    //   console.log('after remote index read test')
    //
    //   await idxIo.deleteLocalDir('test012345678', this.publicKey)
    //   console.log('after deleteLocalDir')
    //
    //   const updatedIndexData2 = await idxIo.readLocalIndex(dirPath)
    //   console.log('after reading updated index')
    //
    //   console.log('El Milagro!')
    // } catch (error) {
    //   console.log(`ERROR reading and updating indexes.`)
    // }
    //
    // console.log('Done!')
    //
    // return

    // End TODO TODO TODO remove this when everything works

    const method = 'engine.js::_fetchUserSettings'
    let encSettingsData = undefined
    try {
      encSettingsData = await this.io.readLocalFile(this.userId, 'settings.json')
      // readLocalFile returns undefined on BlobNotFound, so set new user:
      this.newUser = (encSettingsData) ? false : true
    } catch (error) {
      // Two scenarios:
      //   1. New user (file never created). (continue with defaults)
      //   2. Legitimate error. (Then Block with throw / screen to user)
      //
      // Test to see if this is an existing user by:
      //   1. Checking the database to see if they've persisted data.
      //   2. Failing that, see if they've written a public key.
      //
      let test1Passed = false
      const dbExistingDataPath = common.getDbExistingDataPath(this.publicKey)
      const dbExistingDataPathRef = firebaseInstance.getFirebaseRef(dbExistingDataPath)
      try {
        const existingDataSS = await dbExistingDataPathRef.once('value')
        test1Passed = (existingDataSS && (existingDataSS.val() === 'true'))
      } catch (testError1) {
        // Do nothing.
        console.log(`INFO(${method}): db query failed.\n${testError1}`)
      }

      if (test1Passed) {
        const errMsg = `ERROR(${method}): failure to fetch user settings from GAIA. Try again soon.\n${error}`
        // this.emit('me-fault', errMsg)
        // throw errMsg
      }

      // let test2Passed = false
      // try {
      //   const pkTxtData = await this._fetchPublicKey(this.userId)
      //   test2Passed = (pkTxtData !== undefined &&
      //                  pkTxtData !== null &&
      //                  pkTxtData !== '')
      // } catch (testError2) {
      //   // Do nothing.
      //   console.log(`INFO(${method}): public key read failed.\n${testError2}`)
      // }
      //
      // if (test2Passed) {
      //   const errMsg = `ERROR(${method}): failure to fetch user settings from GAIA. Try again soon.\n${error}`
      //   this.emit('me-fault', errMsg)
      //   throw errMsg
      // }

      // If we got here without throwing, it's likely a new user, proceed with
      // default settings.
      this.newUser = true
    }

    if (encSettingsData) {
      try {
        this.settings = await utils.decryptObj(
          this.privateKey, encSettingsData, ENCRYPT_SETTINGS)
      } catch (err) {
        // Problem if here is likely that another account wrote to the current
        // account's gaia with it's own encryption, resulting in a mac mismatch:
        // TODO: warn user (privacy could be reduced w/ centralized conveniences)
        // this.logger(`ERROR(${method}): using default settings due to decryption error.\n${err}`)
        // TODO: remove these lines when login error fixed:
        const errMsg = `ERROR(${method}): unable to read settings due to decryption error.\n${err}`
        this.emit('me-fault', errMsg)
        throw errMsg
      }
    }

    this.emit('me-update-settings', this.settings);
    await this._fetchDataAndCompleteInit();
  }

  async _fetchDataAndCompleteInit() {
    const method = 'engine.js::_fetchDataAndCompleteInit'

    if (!this.anonalytics) {
      this.anonalytics = new Anonalytics(this.publicKey);
    }
    this.anonalytics.aeLogin();
    this.anonalytics.aePlatformDescription(platform.description);
    // in mobile the app token is undefined (in web it is the value of 'app' in the query string)
    const appToken = undefined
    this.anonalytics.aeLoginContext(utils.getAppContext(appToken));

    this.idxIo = new IndexedIO(this.logger, this.io, this.userId,
                               this.privateKey, this.publicKey, ENCRYPT_INDEXED_IO);

    await this.io.writeLocalFile(this.userId, 'pk.txt', this.publicKey);
    await this.writeSettings(this.settings)

    // TODO: A better mechanism for the retry of contacts read
    //       See notes below for _writeConversations
    //
    let contactArr = [];
    let contactsData = undefined
    try {
      contactsData = await this.io.readLocalFile(this.userId, 'contacts.json')
    } catch (error1) {
      if (!this.newUser) {
        try {
          contactsData = await this.io.readLocalFile(this.userId, 'contacts.json')
        } catch (error2) {
          try {
            contactsData = await this.io.readLocalFile(this.userId, 'contacts.json')
          } catch (error3) {
            this.emit('me-fault', error3)
            throw `ERROR(${method}): failure to fetch contacts from GAIA. Try again soon.\n${error3}`
          }
        }
      }
    }

    if (contactsData) {
      try {
        contactArr = await utils.decryptObj(this.privateKey, contactsData, ENCRYPT_CONTACTS)
      } catch (error) {
        // TODO: consider giving user option to bypass and:
        //       - lose data
        //       - create temporary contacts
        this.emit('me-fault', error)
        throw(`ERROR(${method}): unable to load contacts due to decryption error.\n${error}`)
      }
    }

    this._initWithContacts(contactArr)
  }

  //
  //  Generic
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleShutDownRequest = async () => {
    try {
      // Don't disable emit/listeners for the engine yet (we need to emit one
      // last event).
      this.offlineMsgSvc.offAll()
      this.discovery.offAll()
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

    try {
      await Promise.all(promises)
      this.logger('INFO:(engine.js::handleShutDownRequest): engine shutdown successful.')
    } catch (error) {
      console.log(`ERROR(engine.js::handleShutDownRequest): ${error}`)
    } finally {
      this.offlineMsgSvc = undefined
      this.emit('me-shutdown-complete', true)
    }

    // This code has to be last or at least after we emit 'me-shutdown-complete'.
    try {
      this.offAll()
    } catch (err) {
    }
  }

  //
  //  Mobile
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleMobileForeground() {
    console.log('Engine: Foreground')
  }

  handleMobileBackground() {
    console.log('Engine: Background')
  }
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

  async updateContactPubKey(aContactId) {
    const contact = this.contactMgr.getContact(aContactId)
    if (contact && !this.contactMgr.hasPublicKey(contact)) {
      let publicKey = undefined
      try {
        publicKey = await this._fetchPublicKey(aContactId)
      } catch (error) {
        // Suppress
        return
      }
      if (!publicKey) {
        return
      }

      this.contactMgr.setPublicKey(aContactId, publicKey)
      this.updateContactMgr()
      try {
        await this._writeContactList(this.contactMgr.getAllContacts())
      } catch (error) {
        // Suppress for now
        // TODO: should this emit me-fault ?
      }
    }
  }

  // TODO: wipe this out of we don't use it anywhere (might be a good idea on
  //       startup)
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
  handleOutgoingMessage = async (text, json=undefined) => {
    const method = 'engine.js::handleOutgoingMessage'
    if (!this.contactMgr.getActiveContact()) {
      return
    }

    if (text && json) {
      throw `ERROR(${method}): both text and json cannot be defined.`
    } else if (!text && !json) {
      throw `ERROR(${method}): one of text or json must be defined.`
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
    if (text) {
      chatMsg.init(this.userId, outgoingUserId, this._getNewMessageId(), text,
                   Date.now());
    } else {  // json
      chatMsg.init(this.userId, outgoingUserId, this._getNewMessageId(), json,
                   Date.now(), MESSAGE_TYPE.TEXT_JSON)
    }

    this._sendOutgoingMessageOffline(chatMsg);
    this.anonalytics.aeMessageSent();
    if (this.discovery) {
      this.discovery.inviteContact(outgoingPublicKey);
    }

    this.conversations.addMessage(chatMsg);
    this._writeConversations();

    this.contactMgr.moveContactToTop(outgoingUserId);
    this.contactMgr.setSummary(outgoingUserId, ChatMessage.getSummary(chatMsg));
    this._writeContactList(this.contactMgr.getAllContacts());

    this.updateContactMgr();
    this.updateMessages(outgoingUserId);
  }

  // SO MUCH TODO TODO TODO
  //
  // Callers include anywhere messages arrive or change state to read:
  //    this.addIncomingMessages
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

  addIncomingMessages(messages) {
    for (const message of messages) {
      this.conversations.addMessage(message);
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

      this.contactMgr.setSummary(incomingId, ChatMessage.getSummary(message));

      if (isActive) {
        updateActiveMsgs = true;
        message.seen = true;
        message.msgState = MESSAGE_STATE.SEEN;
        this.conversations.markConversationModified(message);
      } else {
        this.contactMgr.incrementUnread(incomingId);
        const count = this.contactMgr.getAllUnread()
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
  async _writeContactList(aContactArr) {
    const method = 'MessagingEngine::_writeContactList'
    let encContactsData = undefined
    try {
      encContactsData = await utils.encryptObj(this.publicKey, aContactArr, ENCRYPT_CONTACTS)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to encrypt contact list.`, method, error)
    }

    try {
      await this.io.writeLocalFile(this.userId, 'contacts.json', encContactsData)
    } catch (error1) {
      try {
        await this.io.writeLocalFile(this.userId, 'contacts.json', encContactsData)
      } catch (error2) {
        try {
          await this.io.writeLocalFile(this.userId, 'contacts.json', encContactsData)
        } catch (error3) {
          // We write the contact list quite frequently so it's not clear when
          // it's important to throw on failure (other than encryption above).
          // For now we'll suppress it and log it
          const errStr = utils.fmtErrorStr('failed to write contacts.json', method, error3)
          console.log(errStr)
          return
        }
      }
    }

    // TODO: get this event out of here--it shouldn't be tied to contact save,
    //       but rather to the event/code that was started by showAdd.
    // TODO: is this even needed?
    this.emit('me-close-add-ui')
  }

  // TODO: This is a rather awful way to implement an n tries method.
  //       1. Make a generic retry methodology that lets you specify:
  //            - number of retries
  //       2. Think about having a busy mechnanism (i.e. is this op
  //          already occuring/re-trying).
  //       3. Add an exponential retry delay + jitter
  //
  _writeConversations() {
    // TODO:
    // 1. call this less often
    return this.conversations.storeContactBundles()
    .then(() => { return })
    .catch((err1) => {
      // Retry two more times
      //
      return this.conversations.storeContactBundles()
      .then(() => { return })
      .catch((err2) => {
        // Retry one more time
        //
        return this.conversations.storeContactBundles()
        .then(() => { return })
        .catch((err3) => {
          const errMsg = `ERROR(engine.js::_writeConversations): ${err3}`
          this.emit('me-fault', errMsg)
          throw errMsg
        })
      })
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
          contentType: ChatMessage.getType(chatMessage),
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
    // Attempt 3 times, then fail.
    // TODO: more elegant solution with delay/jitter, n-retries.
    //       see notes for _writeConversations on the subject
    //
    console.log(`INFO(engine::_fetchPublicKey) 1st attempt.`)
    return this.io.readRemoteFile(aUserId, 'pk.txt')
    .catch((error1 => {
      console.log(`INFO(engine::_fetchPublicKey) 2nd attempt.\nERROR: ${error1}`)
      return this.io.readRemoteFile(aUserId, 'pk.txt')
      .catch((error2) => {
        console.log(`INFO(engine::_fetchPublicKey) 3nd attempt.\nERROR: ${error2}`)
        return this.io.readRemoteFile(aUserId, 'pk.txt')
      })
    }))
  }

  getAnonalytics() {
    return this.anonalytics;
  }
}
