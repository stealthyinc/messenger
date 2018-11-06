const platform = require('platform');

// Platform dependent (commented out parts are for other platforms)
// -----------------------------------------------------------------------------
// Web/React Server:
//
//const firebaseInstance = require('firebase')
//const { EventEmitterAdapter } = require('./platform/react/eventEmitterAdapter.js')
//const Anonalytics = require('./platform/no-op/Analytics.js')
//const { Graphite, StealthyIndexReader } = require('./platform/no-op/Integrations.js')
//
// Web/React Client (TODO: one day.)
// ...
//
// Mobile/React Native:
//
 const { firebaseInstance } = require('./firebaseWrapper.js')
 const { EventEmitterAdapter } = require('./platform/reactNative/eventEmitterAdapter.js')
 const { Anonalytics } = require('../Analytics.js');
 const { Graphite } = require('./integrations/graphite.js')
 const { StealthyIndexReader } = require('./integrations/stealthyIndexReader.js')
//
// Common:
//
const { MESSAGE_TYPE,
        MESSAGE_STATE,
        ChatMessage } = require('./messaging/chatMessage.js');
const { ConversationManager } = require('./messaging/conversationManager.js');
const { OfflineMessagingServices } = require('./messaging/offlineMessagingServices.js');

const utils = require('./misc/utils.js');

const FirebaseIO = require('./filesystem/firebaseIO.js');
const GaiaIO = require('./filesystem/gaiaIO.js');
const { IndexedIO } = require('./filesystem/indexedIO.js');

const constants = require('./misc/constants.js');

const { ContactManager } = require('./messaging/contactManager.js');

const { Discovery } = require('./misc/discovery.js')

const common = require('./../common.js');

import AmaCommands from './misc/amaCommands.js'

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
const ENABLE_AMA = true
const ENABLE_CHANNELS_V2_0 = true
const ENCRYPT_CHANNEL_NOTIFICATIONS = true
const { ChannelServicesV2 } = require('./messaging/channelServicesV2.js')

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
    this._configureIO()
  }

  //
  //  Initialization
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  async _initWithContacts(contactArr) {
    const method = 'engine::_initWithContacts'

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
                                   this.io,
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

    if (ENABLE_CHANNELS_V2_0) {
      this.offlineMsgSvc.on('offline message written', (messageTuple) => {
        this._sendChannelNotification(messageTuple)
      })

      // AMA specific
      this.offlineMsgSvc.on('ama updated', (amaData) => {
        this.emit('me-ama-status-change', amaData)
      })
    }


    // Lots of possiblities here (i.e. lazy load etc.)
    this.conversations = new ConversationManager(this.logger, this.userId, this.idxIo);
    if (!this.newUser) {
      try {
        await this.conversations.loadContactBundles(this.contactMgr.getContactIds())
      } catch (error) {
        // suppress
        //   TODO: pull from async storage on fail
        console.log(`WARNING(${method}): failed to load contact bundles, proceeding anyway.`)
      }
    }

    // Get the last messages in any channel bundles and update the offlineMessagingServices
    // with that data.
    if (ENABLE_CHANNELS_V2_0) {
      const channelAddresses = {}
      for (const contactId of this.contactMgr.getContactIds()) {
        // TODO: refactor protocol to const string
        if (!utils.isChannelOrAma(this.contactMgr.getProtocol(contactId))) {
          continue
        }

        let msgAddress = {
          outerFolderNumber: 0,
          innerFolderNumber: 0,
          fileNumber: 0
        }
        const messages = this.conversations.getMessages(contactId)
        if (messages && messages.length > 0) {
          let compactMsgAddress = undefined

          let msgIdx = messages.length - 1
          while (msgIdx > 0) {
            const msg = messages[msgIdx]
            compactMsgAddress = (msg && msg.channel) ?
              msg.channel.msgAddress : undefined
            if (compactMsgAddress) {
              break
            }
            msgIdx--
          }
          const tempMsgAddress = ChannelServicesV2.getMsgAddressFromCompact(compactMsgAddress)
          if (tempMsgAddress) {
            msgAddress = tempMsgAddress
          }
        }

        channelAddresses[contactId] = msgAddress
      }

      this.offlineMsgSvc.setChannelAddresses(channelAddresses)
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


    // Add the default channels if we are a first time user
    //  - TODO: mechanism to tie this into settings or firebase (i.e. added
    //          channels once)  This would catch folks like Justin.
    if ((ENABLE_CHANNELS_V2_0 && this.newUser) || process.env.NODE_ENV === 'development') {
      await this._addDefaultChannels()
    }


    // Indicate to FB that we've completed init and are no longer a first time user
    // (used to handle IO errors specially)
    const dbExistingDataPath = common.getDbExistingDataPath(this.publicKey)
    const dbExistingDataPathRef = firebaseInstance.getFirebaseRef(dbExistingDataPath)
    dbExistingDataPathRef.set('true')

    console.log(`INFO(${method}): engine initialized. Emitting me-initialized event.`)
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

  async _configureIO() {
    this.io = (ENABLE_GAIA) ?
      new GaiaIO(this.logger, LOG_GAIAIO) :
      new FirebaseIO(this.logger, STEALTHY_PAGE, LOG_GAIAIO);

    await this._mobileGaiaTest()
    await this._fetchUserSettings();
  }

  // Blockstack's mobile offerings create sessions for GAIA that cause a bug when
  // users sign into one ID, then sign out and sign in to a different ID. Then sign
  // out and back to the first.  What happens is that GAIA on the second sign in
  // is writing to the GAIA from the fist sign in--but with the wrong encryption key!
  // This test prevents that possibility by writing a known value to GAIA and then
  // reading it back. If the value that is read back either mis-matches or doesn't
  // exist then we likely have the issue.
  //
  // me-fault reduction effort. We only throw if we successfully write and read
  // our data back, finding it mismatches. Otherwise we assume things are good to go.
  async _mobileGaiaTest() {
    const method = 'engine::_mobileGaiaTest'

    const testFilePath = 'mobileGaiaTest.txt'
    const testValue = `${Date.now()}_${(Math.random()*100000)}`
    let recoveredValue = undefined
    try {
      await this.io.robustLocalWrite(this.userId, testFilePath, testValue)
      recoveredValue = await this.io.robustLocalRead(this.userId, testFilePath)
    } catch (error) {
      console.log `WARNING(${method}): unable to read / write test file, ${testFilePath}, to / from ${this.userId}'s GAIA. Skipping test.`
      return
    }

    if (recoveredValue !== testValue) {
      const errMsg = `ERROR(${method}): mis-matched GAIA for write and read-back of ${testFilePath} for ${this.userId}. Halting to prevent corruption of cloud storage.`
      const solution = 'It is likely that you have multiple Blockstack user IDs. This problem occurs when logging out and back in with different ideas. A fix is forthcoming. Please close the App and start again.'
      const noRestartButton = true
      this.emit('me-fault', errMsg, solution, noRestartButton)
      throw errMsg
    }
  }

  // Future: a multiple read of settings.json, contacts.json and pk.txt
  //         and a majority test to see if first time user (i.e. if not firebase
  //         and all three null/not present, then decide first time user)
  async _fetchUserSettings() {
    const method = 'engine.js::_fetchUserSettings'
    let encSettingsData = undefined
    try {
      encSettingsData = await this.io.robustLocalRead(this.userId, 'settings.json')
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

      let test2Passed = false
      try {
        const pkTxtData = await this._fetchPublicKey(this.userId)
        test2Passed = (pkTxtData !== undefined &&
                       pkTxtData !== null &&
                       pkTxtData !== '')
      } catch (testError2) {
        // Do nothing.
        console.log(`INFO(${method}): public key read failed.\n${testError2}`)
      }

      // If we got here without throwing, it's likely a new user, proceed with
      // default settings.
      this.newUser = !test1Passed && !test2Passed
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
        // Proceed with default settings after printing warning
        const errMsg = `WARNING(${method}): unable to decrypt stored settings.\n${err}`
        console.log(errMsg)
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

    let contactArr = [];
    let contactsData = undefined
    try {
      const maxAttempts = 5
      contactsData = await this.io.robustLocalRead(this.userId, 'contacts.json', maxAttempts)
    } catch(error) {
      // TODO:
      //   - safe encrypt thie contacts data
      //   - refactor to critical load function that:
      //       - does robust read
      //       - pulls from async storage on fail
      const errMsg = `WARNING(${method}): failure to fetch contacts from GAIA.\n${error}`
      console.log(errMsg)
    }

    if (contactsData) {
      try {
        contactArr = await utils.decryptObj(this.privateKey, contactsData, ENCRYPT_CONTACTS)
      } catch (error) {
        // TODO:
        //   - see above about safe encryption and n-mod redudancy
        const errMsg = `WARNING(${method}): unable to load contacts due to decryption error. Starting with empty contacts list.\n${error}`
        console.log(errMsg)
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
    if (this.offlineMsgSvc) {
      try {
        // Don't disable emit/listeners for the engine yet (we need to emit one
        // last event).
        this.offlineMsgSvc.offAll()
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }

    if (this.discovery) {
      try {
        // Don't disable emit/listeners for the engine yet (we need to emit one
        // last event).
        this.discovery.offAll()
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }

    if (this.offlineMsgSvc) {
      try {
        this.offlineMsgSvc.skipSendService();
        this.offlineMsgSvc.stopSendService();
        this.offlineMsgSvc.pauseRecvService();
        this.offlineMsgSvc.stopRecvService();
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }

    const promises = []
    if (this.offlineMsgSvc) {
      promises.push(
        this.offlineMsgSvc.sendMessagesToStorage()
        .catch(err => {
          console.log(`ERROR(engine.js::handleShutDownRequest): sending messages to storage. ${err}`);
          return undefined;
        })
      );
    }
    if (this.conversations) {
      promises.push(
        this._writeConversations()
        .catch(err => {
          console.log(`ERROR(engine.js::handleShutDownRequest): writing conversations. ${err}`);
          return undefined;
        })
      );
    }
    // We stopped doing this after every incoming msg etc. to
    // speed things along, hence write here.
    //   - to avoid the popup, we should have a timer periodically write
    //     all these and use a dirty flag to determine if we even need to do this.
    if (this.contactMgr) {
      promises.push(
        this._writeContactList(this.contactMgr.getAllContacts())
        .catch(err => {
          console.log(`ERROR(engine.js::handleShutDownRequest): writing contact list. ${err}`);
          return undefined;
        })
      )
    }

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

  // Requires this.offlineMsgSvc configured and not null/undefined
  async receiveMessagesNow() {
    const method = `MessagingEngine::receiveMessagesNow`

    try {
      this.offlineMsgSvc.pauseRecvService();
      await this.offlineMsgSvc.receiveMessages()
    } catch (error) {
      console.log(`ERROR:(${method}): ${error}`);
    } finally {
      this.offlineMsgSvc.resumeRecvService()
    }
  }

  handleMobileBackgroundUpdate() {
    console.log('MessagingEngine::handleMobileBackgroundUpdate:');

    // TODO: - should the service only start on background update and stop when background update done?
    //       - can the service fail if shut down inappropriately (i.e. while waiting on request)?
    if (this && this.offlineMsgSvc && !this.offlineMsgSvc.isReceiving()) {
      this.offlineMsgSvc.pauseRecvService();

      this.offlineMsgSvc.receiveMessages()
      .then(() => {
        this.offlineMsgSvc.resumeRecvService();
      })
      .catch((err) => {
        console.log(`ERROR:(engine.js::handleMobileBackgroundUpdate): ${err}`);
        this.offlineMsgSvc.resumeRecvService();
      })
    } else {
        console.log(`ERROR:(engine.js::handleMobileBackgroundUpdate): unable to call this.offlineMsgSvc.isReceiving()`);
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

    if (this && this.offlineMsgSvc && !this.offlineMsgSvc.isReceiving()) {
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

  async handleContactInvitation(theirPublicKey, theirUserId) {
    const method = 'engine::handleContactInvitation'

    if (this.contactMgr.isExistingContactId(theirUserId)) {
      return
    }

    console.log(`INFO(${method}): discovery event "new-invitation" from ${theirUserId}`)
    // TODO: merge this with code in Block Contact Search (the part that builds up the
    //       contact by parsing the query result)
    try {
      const queryResult = await api.getUserProfile(theirUserId)
      const contact = ContactManager.buildContactFromQueryResult(
        queryResult, theirUserId, theirUserId, theirPublicKey)

      if (contact) {
        const makeActiveContact = false
        await this.handleContactAdd(contact, makeActiveContact)
      }
    } catch (error) {
      console.log(`ERROR(${method}): handling discovery new-invitation from ${theirUserId}.\n${error}`)
    }
  }

  async handleContactAdd(contact, makeActiveContact=true) {
    const method = 'MessagingEngine::handleContactAdd'

    console.log(`DEBUG(${method}): starting contact add for ${contact.id}.`)
    if (this.anonalytics) {
      this.anonalytics.aeContactAdded();
    }

    console.log(`DEBUG(${method}): fetching public key ...`)
    let publicKey = contact.publicKey
    if (!publicKey) {
      try {
        publicKey = await this._fetchPublicKey(contact.id)
        this.logger(`Adding contact ${contact.id}. Read public key: ${publicKey}`);
      } catch(err) {
        this.logger(`Adding contact ${contact.id}. UNABLE TO READ PUBLIC KEY`);
      }
    }

    let isChannel = false
    let protocol = undefined
    let administrable = false
    if (ENABLE_CHANNELS_V2_0) {
      console.log(`DEBUG(${method}): fetching channel protocol ...`)
      protocol = await this._fetchProtocol(contact.id)
      isChannel = utils.isChannelOrAma(protocol)

      // Check to see if we are an administrator on the channel we just added.
      //
      if (ENABLE_AMA && utils.isAma(protocol)) {
        // Fetch the Ama's owner.json and see if we're the owner.
        let owner = false
        let delegate = false

        try {
          const ownerDataStr = await this.io.robustRemoteRead(contact.id, 'owner.json')
          if (ownerDataStr) {
            const ownerData = JSON.parse(ownerDataStr)
            const ownerIdEnc = ownerData.for_owner
            const ownerId = await utils.decryptObj(this.privateKey, ownerIdEnc, true)
            owner = (this.userId === ownerId)
          }
        } catch (error) {
          console.log(`WARNING(${method}): failed to read channel owner information.\n${error}.`)
        }

        // If we're not the channel owner, see if we're a delegate?
        //
        if (!owner) {
          let delegateDataArr = []
          try {
            const delegateDataStr = await this.io.robustRemoteRead(contact.id, 'delegates.json')
            delegateDataArr = JSON.parse(delegateDataStr)
          } catch (error) {
            console.log(`WARNING(${method}): failed to read channel delegate information.\n${error}`)
          }

          const pkLen = this.publicKey.length
          if (pkLen > 4) {
            const pkLast4 = this.publicKey.substr(pkLen-4, pkLen)

            for (const delegateData of delegateDataArr) {
              if (!delegateData.hasOwnProperty(pkLast4)) {
                continue
              }

              try {
                const delegateUserId =
                  await utils.decryptObj(this.privateKey, delegateData[pkLast4], true)
                if (this.userId === delegateUserId) {
                  delegate = true
                  break
                }
              } catch (error) {
                // Suppress (might be last 4 digit of pk colissions).
              }
            }
          }
        }
        administrable = (owner || delegate)
        console.log(`INFO(${method}): administrable = ${administrable}`)
      }
    }

    console.log(`DEBUG(${method}): adding new contact ${contact.id} to contact manager ...`)
    await this.contactMgr.addNewContact(contact, contact.id, publicKey, makeActiveContact);
    // We do the next part here to minimize the reading delay on protocol so that
    // when the contact is added and inserted into the offline messaging service, the
    // protocol and administrability are known and set.
    if (ENABLE_CHANNELS_V2_0) {
      if (protocol) {
        console.log(`DEBUG(${method}): setting channel protocol ...`)
        this.contactMgr.setProtocol(contact.id, protocol)
      }
      if (administrable) {
        this.contactMgr.setAdministrable(contact.id, administrable)
      }
    }


    console.log(`DEBUG(${method}): writing contact list (non blocking) ...`)
    this._writeContactList(this.contactMgr.getContacts());

    console.log(`DEBUG(${method}): creating conversation ...`)
    this.conversations.createConversation(contact.id);

    console.log(`DEBUG(${method}): writing conversations (non blocking) ...`)
    this._writeConversations();

    if (ENABLE_CHANNELS_V2_0 && isChannel) {
      console.log(`DEBUG(${method}): setting channel address in offline msg svc ...`)
      let msgAddress = {
        outerFolderNumber: 0,
        innerFolderNumber: 0,
        fileNumber: 0
      }
      this.offlineMsgSvc.addChannelAddress(contact.id, msgAddress)

      // Automatically send a message invite for channels that are added
      // -- this is used to increment/decrement the number of people in the room.
      //
      console.log(`DEBUG(${method}): db invite contact (member incr, blocking) ...`)
      try {
        await this.discovery.inviteContact(publicKey)
      } catch (error) {
        // Suppress
        console.log(`ERROR(${method}): ${error}.`)
      }
    }

    console.log(`DEBUG(${method}): updating contacts in offline messaging service ...`)
    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts());

    // IMPORTANT (even for Prabhaav):
    // - Do not change the order of these updates. The UI depends on
    //   contact length changed to navigate to the ChatScreen. If you
    //   update messages last, it navigates to a screen with the wrong
    //   messages.
    console.log(`DEBUG(${method}): updating messages (sends event 'me-update-messages') ...`)
    this.updateMessages(contact.id);

    console.log(`DEBUG(${method}): updating contact manager (sends event 'me-update-contactmgr') ...`)
    this.updateContactMgr();

    console.log(`DEBUG(${method}): close contact search (sends event 'me-close-contact-search') ...`)
    this.closeContactSearch();

    // Fast read of messages from contact (in case we're at the start or middle of a polling delay):
    //
    try {
      await this.receiveMessagesNow()
    } catch (error) {
      console.log(`ERROR(${method}): receiveMessagesNow failed.\n${error}`)
    }
  }

  handleDeleteContact = (e, { contact }) => {
    if (this.discovery) {
      this.discovery.clearReceivedInvitation(contact.publicKey)

      if (utils.isChannelOrAma(this.contactMgr.getProtocol(contact.id))) {
        this.discovery.clearSentInvitation(contact.publicKey)
      }
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
    if (name === 'twitterShare') {
      this.settings.twitterShare = !this.settings.twitterShare;
      this.anonalytics.aeSettings(`twitterShare:${this.settings.twitterShare}`);
    }
    else if (name === 'console') {
      this.settings.console = !this.settings.console;
      this.anonalytics.aeSettings(`console:${this.settings.console}`);
    } else if (name === 'analytics') {
      this.settings.analytics = !this.settings.analytics;
      if (this.settings.analytics) {
        this.anonalytics.aeEnable();
      }
      else {
        this.anonalytics.aeDisable();
      }
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

  //
  //  Messaging
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  handleOutgoingMessage = async (text, json=undefined) => {
    const method = 'engine.js::handleOutgoingMessage'
    if (!this.contactMgr.getActiveContact()) {
      return
    }

    if ((text && json) || (!text && !json)) {
      // TODO: we should emit a 'failed to send message' event here that the UI
      //       etc. can learn from and re-attempt.
      const errMsg = `ERROR(${method}): One of the arguments text OR json must be defined, not both or neither. Skipping sending of message.`
      if (process.env.NODE_ENV !== 'production') {
        throw errMsg
      }
      console.log(errMsg)
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

    let displayInConversation = true
    const chatMsg = new ChatMessage();
    if (text) {
      // TODO: Change ama commands to use JSON directly (not type TEXT_JSON, but
      //       a new message type called JSON that is not directly supported for
      //       display so we don't need to rely on this workaround).
      displayInConversation = !AmaCommands.isAmaCommand(text)

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

    if (displayInConversation) {
      this.conversations.addMessage(chatMsg);
      this._writeConversations();


      this.contactMgr.moveContactToTop(outgoingUserId);
      this.contactMgr.setSummary(outgoingUserId, ChatMessage.getSummary(chatMsg));
      this._writeContactList(this.contactMgr.getAllContacts());

      this.updateContactMgr();
      this.updateMessages(outgoingUserId);
    }
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

        // If the message is from a channel, don't send read receipts:
        // TODO: unify the protocol constant
        if (utils.isChannelOrAma(this.contactMgr.getProtocol(fromId))) {
          continue
        }


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

    let decryptionPassed = false
    let encContactsData = undefined
    try {
      encContactsData = await utils.encryptObj(this.publicKey, aContactArr, ENCRYPT_CONTACTS)
      // We never want to write a corrupted contacts file, so test decryption here
      // before writing the data. If it fails, skip writing.
      //   - TODO: turn this into a method with a number of attempts to get a
      //           passing value for important data.
      await utils.decryptObj(this.privateKey, encContactsData, ENCRYPT_CONTACTS)
      decryptionPassed = true
    } catch (error) {
      const errStr = utils.fmtErrorStr(`failed to encrypt contact list.`, method, error)
      console.log(errStr)
    }

    if (decryptionPassed) {
      try {
        await this.io.robustLocalWrite(this.userId, 'contacts.json', encContactsData)
      } catch (error) {
        // We write the contact list quite frequently so it's not clear when
        // it's important to throw on failure (other than encryption above).
        // For now we'll suppress it and log it
        const errStr = utils.fmtErrorStr('failed to write contacts.json', method, error)
        console.log(errStr)
      }
    }

    // We do this even if write didn't work out b/c we don't want the UX to hang.
    //
    // TODO: get this event out of here--it shouldn't be tied to contact save,
    //       but rather to the event/code that was started by showAdd.
    // TODO: is this even needed?
    this.emit('me-close-add-ui')
  }

  async _writeConversations() {
    const method = 'engine::_writeConversations'

    try {
      await this.conversations.storeContactBundles()
    } catch (error) {
      const errMsg = `WARNING(${method}): failure storing contact bundles.\n${error}`
      console.log(errMsg)
    }
  }

  async writeSettings(theSettings) {
    const method = 'engine::writeSettings'

    if (!theSettings || (theSettings === {})) {
      theSettings = { time: Date.now() }
    }

    try {
      let encSettingsData = await utils.encryptObj(this.publicKey, theSettings, ENCRYPT_SETTINGS)
      await this.io.robustLocalWrite(this.userId, 'settings.json', encSettingsData)
    } catch (error) {
      const errMsg = `WARNING(${method}): failure storing settings.\n${error}`
      console.log(errMsg)
    }
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
        const msgAddress = (chatMessage.channel) ?
          chatMessage.channel.msgAddress : undefined
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
          msgAddress
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

  async _fetchPublicKey(aUserId) {
    return this.io.robustRemoteRead(aUserId, 'pk.txt')
  }

  getAnonalytics() {
    return this.anonalytics;
  }

  // Stealthy Channel 2.0 Work:
  //////////////////////////////////////////////////////////////////////////////

  async _fetchProtocol(aUserId) {
    const method = 'MessagingEngine::_fetchProtocol'

    const maxAttempts = 5
    let stringifiedInfo = undefined
    try {
      console.log(`INFO(${method}): reading info.json.`)
      stringifiedInfo = await this.io.robustRemoteRead(aUserId, 'info.json', maxAttempts)
    } catch (error) {
      // Supress: assume user is regular user, return undefined
      console.log(`ERROR(${method}): failed reading info.json for ${aUserId}.\n  ${error}`)
      return undefined
    }

    if (stringifiedInfo) {
      try {
        console.log(`INFO(${method}): processing data from info.json.\n  ${stringifiedInfo}\n`)
        const info = JSON.parse(stringifiedInfo)
        return `${info.protocol} ${info.version.major}.${info.version.minor}`
      } catch (error) {
        // Supress: assume user is regular user, return undefined
        console.log(`ERROR(${method}): failed processing data from info.json.\n  ${error}`)
      }
    } else {
      console.log(`INFO(${method}): no data in info.json or info.json doesn't exist.`)
    }

    return undefined
  }

  // aMessageTuple: {filePath, chatMsg, publicKey}
  async _sendChannelNotification(aMessageTuple) {
    try {
      const destinationId = aMessageTuple.chatMsg.to

      // TODO: refactor constants to channel 2.0 ...
      if (utils.isChannelOrAma(this.contactMgr.getProtocol(destinationId)) &&
          aMessageTuple.filePath && aMessageTuple.publicKey) {
        const notificationData = {
          sender: this.userId,
          messageFilePath: aMessageTuple.filePath
        }

        const encNotificationData = await utils.encryptObj(
          aMessageTuple.publicKey, notificationData, ENCRYPT_CHANNEL_NOTIFICATIONS)

        const dbChannelNotificationPath =
          common.getDbChannelNotificationPath(aMessageTuple.publicKey)
        const dbChannelNotificationPathRef =
          firebaseInstance.getFirebaseRef(dbChannelNotificationPath).push()
        dbChannelNotificationPathRef.set(encNotificationData)
      }
    } catch (error) {
      // Suppress
      console.log(`ERROR:(engine::_sendChannelNotification): ${error}`)
    }
  }

  async _addDefaultChannels() {
    const method = `engine::_addDefaultChannels`
    const defaultChannelIds = ['hello.stealthy.id']

    for (const channelId of defaultChannelIds) {
      if (this.contactMgr.isExistingContactId(channelId)) {
        continue
      }

      try {
        const publicKey = await this._fetchPublicKey(channelId)
        await this.handleContactInvitation(publicKey, channelId)
      } catch (error){
        // Suppress
        console.log(`WARNING(${method}): problem adding default channel ${channelId}.\n${error}.`)
        continue
      }
    }

  }

  // Stealthy AMA 1.0 Work:
  //////////////////////////////////////////////////////////////////////////////

  // Fetches the json data model for an AMA and pushes it out in an event.
  //
  // TODO: work with PBJ to also include the userID of the AMA (hardcode for now)
  async fetchAmaData(msgAddress, amaId) {
    const method = 'MessagingEngine::fetchAmaData'

    console.log(`INFO(${method}): msgAddress=${msgAddress}, amaId=${amaId}`)
    if (msgAddress && amaId) {
      const idWorkaround = 'startupschool.stealthy.id'
      const amaFilePath = ChannelServicesV2.getAmaFilePath(msgAddress)
      const amaDataStringified = await this.io.robustRemoteRead(idWorkaround, amaFilePath)
      let amaData = {}
      try {
        amaData = JSON.parse(amaDataStringified)
      } catch (error) {
        // Suppress
      }
      this.emit('me-update-ama-data', amaData)
    } else {
      this.emit('me-update-ama-data', {})
    }
  }
}
