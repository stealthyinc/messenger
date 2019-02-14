import AmaCommands from './misc/amaCommands.js'

import API from './../Services/Api'

import {AsyncStorage} from 'react-native'

const platform = require('platform')

const RNFetchBlob = require('rn-fetch-blob').default

// Platform dependent (commented out parts are for other platforms)
// -----------------------------------------------------------------------------
// Web/React Server:
//
// const firebaseInstance = require('firebase')
// const { EventEmitterAdapter } = require('./platform/react/eventEmitterAdapter.js')
// const Anonalytics = require('./platform/no-op/Analytics.js')
//
// Web/React Client (TODO: one day.)
// ...
//
// Mobile/React Native:
//
const { firebaseInstance } = require('./firebaseWrapper.js')
const { EventEmitterAdapter } = require('./platform/reactNative/eventEmitterAdapter.js')
const { Anonalytics } = require('../Analytics.js')
//
// Common:
//
const { MESSAGE_TYPE,
        MESSAGE_STATE,
        ChatMessage } = require('./messaging/chatMessage.js')
const { ConversationManager } = require('./messaging/conversationManager.js')
const { OfflineMessagingServices } = require('./messaging/offlineMessagingServices.js')

const utils = require('./misc/utils.js')

const FirebaseIO = require('./filesystem/firebaseIO.js')
const GaiaIO = require('./filesystem/gaiaIO.js')
const { IndexedIO } = require('./filesystem/indexedIO.js')
const { LocalIO } = require('./filesystem/localIO.js')

const constants = require('./misc/constants.js')

const { ContactManager } = require('./messaging/contactManager.js')

const { Discovery } = require('./misc/discovery.js')
const { Timer } = require('./misc/timer.js')

import { SettingsDataObj } from './data/settingsDataObj'
import { ContactsDataObj } from './data/contactsDataObj'
import { ContactsImgDataObj } from './data/contactsImgDataObj'

const common = require('./../common.js')
const api = API.create()

// Filename constants:
const CONTACTS_FILE = 'contacts.json'
const CONTACTS_IMGS_FILE = 'contactsImgs.json'
const SETTINGS_FILE = 'settings.json'
const AMA_DATA_FILE = 'ama-data.json'
const AMA_OWNER_FILE = 'owner.json'
const AMA_DELEGATES_FILE = 'delegates.json'
const STARTUP_TESTS_FILE = 'startTests.json'
const PROTOCOL_FILE = 'info.json'
const PUB_KEY_FILE = 'pk.txt'

// TODO: figure out how to only include/build this for development
const ENABLE_MEASUREMENTS = false
const measureIO = require('./measure/measureIOSpeed.js')

//
const ENCRYPT_INDEXED_IO = true
//
const ENABLE_RECEIPTS = true
let ENABLE_GAIA = true
// let ENCRYPT_MESSAGES = true
let ENCRYPT_CONTACTS = true
let ENCRYPT_SETTINGS = true
//
// Options include: 'LOCALHOST', 'TEST_STEALTHY', & 'STEALTHY'
let STEALTHY_PAGE = 'LOCALHOST'
//
// Logging Scopes
const LOG_GAIAIO = false
const LOG_OFFLINEMESSAGING = false
//
const ENABLE_AMA = true
const ENABLE_CHANNELS_V2_0 = true
const ENCRYPT_CHANNEL_NOTIFICATIONS = true
const { ChannelServicesV2 } = require('./messaging/channelServicesV2.js')

export class MessagingEngine extends EventEmitterAdapter {
  constructor (logger,
              privateKey,
              publicKey,
              avatarUrl,
              sessionId) {
    super()
    this.logger = logger
    this.privateKey = privateKey
    this.publicKey = publicKey
    this.avatarUrl = avatarUrl
    this.sessionId = sessionId
    this.discovery = undefined

    this.startTests = {}
    this.settings = new SettingsDataObj()
    this.contacts = new ContactsDataObj()

    // We were storing base64 images in the contacts array and it was leading to
    // big files that slowed GAIA reads/writes as well as really long encryption
    // decryption times. This dictionary is used to store those images and also
    // persist them to GAIA / local storage, but in fewer situations than would
    // occur with the regular contacts list which tracks order, last message,
    // and number of unread messages among other things:
    this.loadedContactImages = false
    this.contactsImgs = new ContactsImgDataObj()

    this.contactMgr = undefined

    this.myTimer = new Timer('Enter MessagingEngine Ctor')

    this.userId = undefined

    this.conversations = undefined
    this.offlineMsgSvc = undefined
    this.io = undefined
    this.shuttingDown = false
    this.anonalytics = undefined

    this.deviceIO = undefined

    this.writeContactListRequests = 0

    // Simple dictionary of amaId to array of voted question Ids.
    // e.g. for ama 001, an upvote of question 123 would look like:
    //   {
    //     001: [123]
    //   }
    this.amaData = {
      amaVoting: {}
    }

    // This member determines behavior on read failures (prevents data loss
    // from clobbering write on failure)
    this.newUser = undefined
  }

  log = (display, ...args) => {
    if (display) {
      this.logger(...args)
    }
  }

  // Status Display to User
  reportStatus = (message) => {
    this.emit('me-engine-status', message)
  }

  //
  //  API Events
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  updateContactMgr () {
    // We clone this here so that the GUI actually updates the contacts on
    // state change. (React setState didn't detect changes unless the whole array
    // object changes.)

    // In mobile we don't force an active contact
    const forceActiveContact = false
    const contactMgr = new ContactManager(forceActiveContact)
    contactMgr.clone(this.contactMgr)

    // Merge the pointers to the contact images to the cloned contact manager so
    // they can be displayed in the UI.
    for (const contact of contactMgr.getContacts()) {
      contactMgr.setProfileImage(contact,
                                 this.contactsImgs.getContactImg(contact.id))
    }
    this.emit('me-update-contactmgr', contactMgr)
  }

  updateMessages (aContactId) {
    const theMessages = this._getMessageArray(aContactId)
    this.emit('me-update-messages', theMessages)
  }

  closeContactSearch () {
    this.emit('me-close-contact-search', true)
  }

  async readAmaData () {
    try {
      const encAmaData = await this.io.robustLocalRead(this.userId, AMA_DATA_FILE)
      if (encAmaData) {
        const amaData = await utils.decryptObj(this.privateKey, encAmaData, true)
        if (amaData) {
          console.log(`INFO(MessagingEngine::readAmaData): setting amaData from stored data.`)
          this.amaData = amaData
        }
      }
    } catch (error) {
      console.log(`ERROR(MessagingEngine::readAmaData): failed to read or decrypt ${AMA_DATA_FILE}.\n${error}`)
    }
  }

  async writeAmaData () {
    try {
      const encAmaData = await utils.encryptObj(this.publicKey, this.amaData, true)
      await this.io.robustLocalWrite(this.userId, AMA_DATA_FILE, encAmaData)
    } catch (error) {
      console.log(`ERROR(MessagingEngine::writeAmaData): failed to write or encrypt amaData.\n${error}`)
    }
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

    this.userId = userId
    this._initEngine()
  }

  async _initEngine() {
    await this._configureIO()
    await this._startupWork()
    await this._fetchUserSettings()
    await this._fetchUserContacts()
    await this._initWithContacts()

    // post-visible to user work
    await this._backgroundSyncData()

    // non-sequential post-visible to user work
    this._backgroundInitTasks()
  }

  async _configureIO () {
    const method = 'MessagingEngine::_configureIO'

    this.myTimer.logEvent('Enter _configureIO')
    this.deviceIO = new LocalIO()

    this.io = undefined
    if (ENABLE_GAIA) {
      this.io = new GaiaIO(
        this.logger, this.userId, this.publicKey, this.deviceIO, LOG_GAIAIO)

      await this.io.init(this.privateKey)
    } else {
      this.io = new FirebaseIO(this.logger, STEALTHY_PAGE, LOG_GAIAIO)
    }

    this.idxIo = new IndexedIO(this.logger, this.io, this.userId,
                               this.privateKey, this.publicKey, ENCRYPT_INDEXED_IO)
  }

  async _startupWork() {
    try {
      const strStartTests = await this.deviceIO.readLocalFile(this.userId, STARTUP_TESTS_FILE)
      if (strStartTests) {
        this.startTests = JSON.parse(strStartTests)
      }
    } catch (error) {
      console.log(`INFO(${method}): unable to read local file ${STARTUP_TESTS_FILE}.`)
    }

    this.myTimer.logEvent('Starting mobileGaiaTest')
    if (this.startTests.hasOwnProperty('mobileGaiaTest') &&
        this.startTests.mobileGaiaTest) {
      this.myTimer.logEvent('Skipping mobileGaiaTest')
    } else {
      await this._mobileGaiaTest()
      this.startTests.mobileGaiaTest = true
      this.myTimer.logEvent('Completed mobileGaiaTest')
    }

    this.myTimer.logEvent(`Starting write of ${PUB_KEY_FILE}`)
    if (this.startTests.hasOwnProperty('wrotePkTxt') &&
        this.startTests.wrotePkTxt) {
      this.myTimer.logEvent(`Skipping write of ${PUB_KEY_FILE}`)
    } else {
      await this.io.robustLocalWrite(this.userId, PUB_KEY_FILE, this.publicKey)
      this.startTests.wrotePkTxt = true
      this.myTimer.logEvent(`After writing ${PUB_KEY_FILE}`)
    }

    this.deviceIO.writeLocalFile(
      this.userId, STARTUP_TESTS_FILE, JSON.stringify(this.startTests))
    .catch((error) => {
      console.log(`INFO(${method}): unable to write local file ${STARTUP_TESTS_FILE} to device.\n${error}`)
    });
  }


  //  Initialization
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
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
  async _mobileGaiaTest () {
    const method = 'engine::_mobileGaiaTest'
    this.myTimer.logEvent('Enter _mobileGaiaTest')

    const testFilePath = 'mobileGaiaTest.txt'
    const testValue = `${Date.now()}_${(Math.random() * 100000)}`
    let recoveredValue
    try {
      await this.io.robustLocalWrite(this.userId, testFilePath, testValue)
      recoveredValue = await this.io.robustLocalRead(this.userId, testFilePath)
    } catch (error) {
      console.log`WARNING(${method}): unable to read / write test file, ${testFilePath}, to / from ${this.userId}'s GAIA. Skipping test.`
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
  async _fetchUserSettings () {
    const method = 'engine.js::_fetchUserSettings'
    this.myTimer.logEvent('_fetchUserSettings    (Entered)')

    this.myTimer.logEvent(`_fetchUserSettings    (Starting read of ${SETTINGS_FILE})`)
    let encSettingsData = undefined
    try {

      encSettingsData = await this.deviceIO.readLocalFile(this.userId, SETTINGS_FILE)
      this.myTimer.logEvent(`_fetchUserSettings    (Read ${SETTINGS_FILE} from device)`)
      if (!encSettingsData) {
        encSettingsData = await this.io.robustLocalRead(this.userId, SETTINGS_FILE)
        this.myTimer.logEvent(`_fetchUserSettings    (Read ${SETTINGS_FILE} from GAIA)`)
      }
      // readLocalFile returns undefined on BlobNotFound, so set new user:
      this.newUser = (encSettingsData) ? false : true
    } catch (error) {
      // Suppress
    }

    if (encSettingsData) {
      try {
        const settingsData = await utils.decryptObj(
          this.privateKey, encSettingsData, ENCRYPT_SETTINGS)

        this.settings.initFromObj(settingsData)
        this.myTimer.logEvent(`_fetchUserSettings    (After decrypting ${SETTINGS_FILE})`)
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

    this.emit('me-update-settings', this.settings.getData())
  }

  async _fetchUserContacts () {
    const method = 'engine.js::_fetchUserContacts'
    this.myTimer.logEvent('_fetchUserContacts    (Entered)')

    if (!this.anonalytics) {
      this.anonalytics = new Anonalytics(this.publicKey)
    }
    this.anonalytics.aeLogin()
    this.anonalytics.aePlatformDescription(platform.description)
    // in mobile the app token is undefined (in web it is the value of 'app' in the query string)
    const appToken = undefined
    this.anonalytics.aeLoginContext(utils.getAppContext(appToken))
    this.myTimer.logEvent('_fetchUserContacts    (Anonalytics operations complete)')

    let encContactsData = undefined
    try {
      this.myTimer.logEvent(`_fetchUserContacts    (Starting read of ${CONTACTS_FILE})`)
      encContactsData = await this.deviceIO.readLocalFile(this.userId, CONTACTS_FILE)
      this.myTimer.logEvent(`_fetchUserContacts    (Read ${CONTACTS_FILE} from device)`)
      if (!encContactsData) {
        const maxAttempts = 5
        encContactsData = await this.io.robustLocalRead(this.userId, CONTACTS_FILE, maxAttempts)
        this.myTimer.logEvent(`_fetchUserContacts    (Read ${CONTACTS_FILE} from GAIA.`)
      }
    } catch (error) {
      // TODO:
      //   - safe encrypt thie contacts data
      //   - refactor to critical load function that:
      //       - does robust read
      //       - pulls from async storage on fail
      const errMsg = `WARNING(${method}): failure to fetch contacts from GAIA.\n${error}`
      console.log(errMsg)
    }

    if (encContactsData) {
      try {
        const contactsData =
          await utils.decryptObj(this.privateKey, encContactsData, ENCRYPT_CONTACTS)
        this.contacts.initFromObj(contactsData)
        this.myTimer.logEvent(`_fetchUserContacts    (After decrypting ${CONTACTS_FILE} data)`)
      } catch (error) {
        // TODO:
        //   - see above about safe encryption and n-mod redudancy
        const errMsg = `WARNING(${method}): unable to load contacts due to decryption error. Starting with empty contacts list.\n${error}`
        console.log(errMsg)
      }
    }
  }

  async _initWithContacts () {
    const method = 'engine::_initWithContacts'
    this.myTimer.logEvent('_initWithContacts    (Entered)')

    // In mobile we don't force an active contact
    const forceActiveContact = false
    this.contactMgr = new ContactManager(forceActiveContact)
    ContactManager.sanitizeContactArr(this.contacts.getData())
    this.contactMgr.initFromArray(this.contacts.getData())
    if (!forceActiveContact) {
      // No contact is selected initially in mobile, so unset the active contact
      this.contactMgr.setActiveContact(undefined)
    }
    this.updateContactMgr()


    // Never in production:
    if (process.env.NODE_ENV !== 'production' &&
        ENABLE_MEASUREMENTS) {
      await measureIO.asyncIoVsGaiaIo(this.userId, this.contactMgr.getContacts(), this.io)
    }


    this.offlineMsgSvc =
      new OfflineMessagingServices(this.logger,
                                   this.userId,
                                   this.idxIo,
                                   this.io,
                                   this.contactMgr.getContacts(),
                                   LOG_OFFLINEMESSAGING)
    this.offlineMsgSvc.startSendService()

    this.offlineMsgSvc.on('new messages', (messages) => {
      const unreceivedMessages = []
      for (const message of messages) {
        if (message) {
          if (((message.type === MESSAGE_TYPE.TEXT) ||
               (message.type === MESSAGE_TYPE.TEXT_JSON)) &&
              !this.conversations.hasMessage(message)) {
            unreceivedMessages.push(message)
          } else if (message.type === MESSAGE_TYPE.RECEIPT) {
            this.handleReceipt(message)
          }
        }
      }

      this.addIncomingMessages(unreceivedMessages)
      this.updateContactOrderAndStatus(unreceivedMessages)
      this.sendMessageReceipts(unreceivedMessages)
    })

    this.offlineMsgSvc.on('offline messages sent', () => {
      // The offline service has sent messages and updated their status.
      // We want to do a redraw of the current message window to update
      // status indicators (spinners--> solid gray checkmarks) and perform
      // a bundle write to store the change.
      this._writeConversations()

      if (this.contactMgr.getActiveContact()) {
        this.updateMessages(this.contactMgr.getActiveContact().id)
      }
    })

    if (ENABLE_CHANNELS_V2_0) {
      this.offlineMsgSvc.on('offline message written', (messageTuple) => {
        this._sendChannelNotification(messageTuple)
      })

      // AMA specific
      this.offlineMsgSvc.on('ama updated', (amaData) => {
        this.annotateAmaData(amaData)
        this.emit('me-ama-status-change', amaData)
      })
    }

    // Lots of possiblities here (i.e. lazy load etc.)
    this.conversations = new ConversationManager(this.logger, this.userId, this.idxIo)
    if (!this.newUser) {
      try {
        this.myTimer.logEvent('_initWithContacts    (Before attempting to load contact bundles.)')
        await this.conversations.loadContactBundles(this.contactMgr.getContactIds())
        this.myTimer.logEvent('_initWithContacts    (After successfully loading contact bundles.)')
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
          let compactMsgAddress

          let msgIdx = messages.length - 1
          while (msgIdx > 0) {
            const msg = messages[msgIdx]
            compactMsgAddress = (msg && msg.channel)
              ? msg.channel.msgAddress : undefined
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

        // Indexing / design workaround for efficiency:
        //   - When restoring from bundles, we look for the last channel message
        //     and examine it's address. We set this as the last address. We need
        //     to increment by 1 to prevent inadvertent reads of messages that
        //     we already have.  EXCEPT for message zero when messages.length is
        //     zero--in that case we need to still fetch the first message.
        if ((messages.length === 0) && ChannelServicesV2.isFirstMsgAddress(msgAddress)) {
          // Don't increment
        } else {
          // Increment
          ChannelServicesV2.incrementMsgAddress(msgAddress)
        }
        channelAddresses[contactId] = msgAddress

        if (this.contactMgr.isNotifications(contactId)) {
          firebaseInstance.subscribeToTopic(contactId)
        }
      }

      this.offlineMsgSvc.setChannelAddresses(channelAddresses)
    }

    // TODO TODO TODO:  change this to be an emitter that sends the ids of sent
    //                  messages back to the engine so we don't have to make
    //                  a conversations ref in offlineMsgSvc
    this.offlineMsgSvc.setConversationManager(this.conversations)

    let activeContactId
    if (this.contactMgr.getActiveContact()) {
      activeContactId = this.contactMgr.getActiveContact().id
      const seenMessages = this.markReceivedMessagesSeen(activeContactId)
      this.sendMessageReceipts(seenMessages)
    }

    this.offlineMsgSvc.startRecvService()
    this.myTimer.logEvent('_initWithContacts    (after startRecvService)')

    // Update the summaries for all contacts.
    //   TODO: clean this up into method(s) on conversations and contactMgr (AC)
    for (const contactId of this.contactMgr.getContactIds()) {
      const messages = this.conversations.getMessages(contactId)

      const lastMessage = (messages && (messages.length > 0))
        ? ChatMessage.getSummary(messages[messages.length - 1]) : ''
      this.contactMgr.setSummary(contactId, lastMessage)

      if (contactId !== activeContactId) {
        let count = 0
        for (const message of messages) {
          // Skip messages we wrote--we only count the ones we receive (
          // unless they are in the special case where we sent them to
          // ourselves).
          if (!(message.to === message.from) &&
              (this.userId === message.from)) {
            continue
          }

          if (!message.seen) {
            count++
          }
          if (count === 99) {
            break
          }
        }
        this.contactMgr.setUnread(contactId, count)
      }
    }

    if (activeContactId) {
      this.updateMessages(activeContactId)
    }
    this.updateContactMgr()
    this.myTimer.logEvent('_initWithContacts    (after updateContactMgr)')

    // Setup Discovery services:
    if (this.settings.getDiscovery()) {
      this.discovery = new Discovery(this.userId, this.publicKey, this.privateKey)
      this.discovery.on('new-invitation',
                        (theirPublicKey, theirUserId) =>
                          this.handleContactInvitation(theirPublicKey, theirUserId))

      this.discovery.monitorInvitations()
    }
    this.myTimer.logEvent('_initWithContacts    (after monitorInvitations)')

    // Indicate to FB that we've completed init and are no longer a first time user
    // (used to handle IO errors specially)
    const dbExistingDataPath = common.getDbExistingDataPath(this.publicKey)
    const dbExistingDataPathRef = firebaseInstance.getFirebaseRef(dbExistingDataPath)
    dbExistingDataPathRef.set('true')

    console.log(`INFO(${method}): engine initialized. Emitting me-initialized event.`)
    this.emit('me-initialized', true)
    this.myTimer.logEvent('_initWithContacts    (emit me-initialized)')
    this.logger(this.myTimer.getEvents())
  }

  async _backgroundSyncData() {
    const method = 'MessagingEngine::_backgroundSyncData'

    // Store data for settings, contacts, and conversation bundles after startup.
    //
    // Settings.json  4 possibilities:
    // 1. New user. Write our current settings to GAIA and the device.
    //    Test: this.newUser is true.
    // 2. Existing user. GAIA settings in old format.
    //    Write our current settings to GAIA and the device.
    //    Test: this.settings time cloud saved and time local saved is undefined,
    //          but time modified is defined.
    // 3. Existing user. GAIA settings older than local settings.
    //    Write our current settings to GAIA and the device.
    // 4. Existing user. GAIA settings newer than local settings.
    //    Unhandled--TODO TODO TODO
    //    This will happen if multiple instances are possible.
    //
    try {
      await this.writeSettings()
    } catch (error) {
      console.log(`WARNING(${method}): Failed to write settings.\n${error}`)
    }

    try {
      // This method must be followed with a call to write the contact list!
      await this._loadContactImages()
    } catch (error) {
      console.log(`WARNING(${method}): Failed to load contact images.\n${error}`)
    }

    //
    // Similar situation for Contacts.json (4 possibilities mentioned above)
    try {
      await this._writeContactList()
    } catch (error) {
      console.log(`WARNING(${method}): Failed to write contacts.\n${error}`)
    }
  }

  async _backgroundInitTasks() {
    // Add the default channels if we are a first time user
    //  - TODO: mechanism to tie this into settings or firebase (i.e. added
    //          channels once)  This would catch folks like Justin.
    if ((ENABLE_CHANNELS_V2_0 && this.newUser) || process.env.NODE_ENV === 'development') {
      await this._addDefaultChannels()

      // TODO: local store AMA data too (not just in GAIA)
      this.readAmaData()
    }
  }

  async _loadContactImages() {
    // Migrate the legacy contacts system to store contact images separately
    // from the other contacts data to reduce the load of encrypting and storing
    // changes in contact order, summaries, and unread.
    //
    // 1. Read the contact images.
    //
    let encContactsImgData = undefined
    try {
      encContactsImgData =
        await this.deviceIO.readLocalFile(this.userId, CONTACTS_IMGS_FILE)
      if (!encContactsImgData) {
        encContactsImgData =
          await this.io.robustLocalRead(this.userId, CONTACTS_IMGS_FILE)
      }
    } catch (error) {
      console.log(`WARNING(${method}): unable to read ${CONTACTS_IMGS_FILE}`)
    }
    //
    let contactsImgData = undefined
    if (encContactsImgData) {
      try {
        contactsImgData = await utils.decryptObj(this.privateKey, encContactsImgData, true)
      } catch (error) {
        console.log(`S-ERROR(${method}): unable to decrypt ${CONTACTS_IMGS_FILE}`)
      }
    }
    //
    if (contactsImgData) {
      // 2. If they exist then:
      //      - initialize the ContactsImgDataObj with them.
      //      - update contacts in the UI so that images appear.
      this.contactsImgs.initFromObj(contactsImgData)
    } else {
      // 3. If they do not exist then:
      //      - populate the ContactsImgDataObj and save it.
      //      - remove images from the existing contact manager and
      //        contact array and save it.
      //      - update contacts in the UI so that images appear.
      //
      let modifiedContactArr = false
      const contactArr = this.contactMgr.getContacts()
      for (const contact of contactArr) {
        this.contactsImgs.setContactImg(contact)
        if (contact.hasOwnProperty('base64')) {
          delete contact.base64
          this.contactMgr.setContactArrModified('MessagingEngine::_backgroundInitTasks')
        }
      }

      // this.loadedContactImages = true
      // this._writeContactList()
      // this.updateContactMgr()
    }

    this.updateContactMgr()
    this.loadedContactImages = true
  }

  //
  //  Generic
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleShutDownRequest = async () => {
    const method = 'engine::handleShutDownRequest'
    console.log(`INFO(${method}): called.`)
    const shutDownTimer = new Timer('handleShutDownRequest called')

    // Clear the mobileGaiaTest flag on start tests to ensure we test for bad
    // / cross GAIA log in.
    this.startTests.mobileGaiaTest = false
    this.deviceIO.writeLocalFile(
      this.userId, STARTUP_TESTS_FILE, JSON.stringify(this.startTests))
    .catch((error) => {
      // suppress & do nothing
      console.log(`S-ERROR(${method}): unable to clear mobileGaiaTest flag in local file startTests.txt.`)
    });
    shutDownTimer.logEvent(`   initiated async device write of ${STARTUP_TESTS_FILE}`)

    if (this.offlineMsgSvc) {
      try {
        // Don't disable emit/listeners for the engine yet (we need to emit one
        // last event).
        this.offlineMsgSvc.offAll()
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }
    shutDownTimer.logEvent('   removed offlineMsgSvc listeners.')

    if (this.discovery) {
      try {
        // Don't disable emit/listeners for the engine yet (we need to emit one
        // last event).
        this.discovery.offAll()
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }
    shutDownTimer.logEvent('   removed discovery listeners.')

    console.log(`INFO(${method}): removed event listeners.`)

    if (this.offlineMsgSvc) {
      try {
        this.offlineMsgSvc.clearReceiveMessageQueue()
        this.offlineMsgSvc.pauseRecvService()
        this.offlineMsgSvc.stopRecvService()
        //
        this.offlineMsgSvc.skipSendService()
        this.offlineMsgSvc.stopSendService()
      } catch (err) {
        // do nothing, just don't prevent the code below from happening
      }
    }
    shutDownTimer.logEvent('   stopped offlineMsgSvc service.')

    console.log(`INFO(${method}): stopped offline msg send/receive service.`)

    // Unsubscribe from channels to prevent notification madness
    if (this.contactMgr) {
      for (const contact of this.contactMgr.getContacts()) {
        try {
          if (contact.hasOwnProperty('protocol') &&
              utils.isChannelOrAma(contact.protocol)) {
            firebaseInstance.unsubscribeFromTopic(contact.id)
          }
        } catch(error) {
          // Suppress
        }
      }
    }
    shutDownTimer.logEvent('   initiated async notification unsubscribe for channels.')

    try {
      await this.offlineMsgSvc.sendMessagesToStorage()
      console.log(`INFO(${method}): wrote offline messages.`)
    } catch (error) {
      console.log(`ERROR(${method}): writing offline messages.`)
    }
    shutDownTimer.logEvent('   wrote offline messages to GAIA storage.')

    try {
      // Writing contacts can be a very expensive operation on Android low performance
      // devices. Before we do a write, we quickly check whether or not it is necessary.
      //
      await this._writeContactList()
      console.log(`INFO(${method}): wrote contacts.`)
    } catch (error) {
      console.log(`ERROR(${method}): writing contacts.`)
    }
    shutDownTimer.logEvent('   wrote contact list to GAIA storage.')

    try {
      await this._writeConversations()
      console.log(`INFO(${method}): wrote conversations.`)
    } catch (error) {
      console.log(`ERROR(${method}): writing conversations.`)
    }
    shutDownTimer.logEvent('   wrote conversation bundles to GAIA storage.')


    this.logger(`INFO:(${method}): engine shutdown successful.`)
    this.offlineMsgSvc = undefined

    shutDownTimer.logEvent('   engine shutdown complete - issuing event.')
    console.log(shutDownTimer.getEvents())

    // Don't issue this in Android (if we timed out on the UI, this gets
    // cached and causes an immediate sign out on the next sign in, resulting
    // in a crash)
    // if (!utils.isAndroid()) {
      this.emit('me-shutdown-complete', true)
    // }

    // This code has to be last or at least after we emit 'me-shutdown-complete'.
    try {
      this.offAll()
    } catch (err) {
    }
    console.log(`INFO(${method}): removed all event listeners.`)
  }

  //
  //  Mobile
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleMobileForeground () {
    console.log('Engine: Foreground')
  }

  handleMobileBackground () {
    console.log('Engine: Background')
  }

  // Requires this.offlineMsgSvc configured and not null/undefined
  async receiveMessagesNow () {
    const method = `MessagingEngine::receiveMessagesNow`

    try {
      this.offlineMsgSvc.pauseRecvService()
      await this.offlineMsgSvc.receiveMessages()
    } catch (error) {
      console.log(`ERROR:(${method}): ${error}`)
    } finally {
      this.offlineMsgSvc.resumeRecvService()
    }
  }

  handleMobileBackgroundUpdate () {
    console.log('MessagingEngine::handleMobileBackgroundUpdate:')

    // TODO: - should the service only start on background update and stop when background update done?
    //       - can the service fail if shut down inappropriately (i.e. while waiting on request)?
    if (this && this.offlineMsgSvc) {

      if (!this.offlineMsgSvc.isReceiving()) {
        this.offlineMsgSvc.pauseRecvService()

        this.offlineMsgSvc.receiveMessages()
        .then(() => {
          this.offlineMsgSvc.resumeRecvService()
        })
        .catch((err) => {
          console.log(`ERROR:(engine.js::handleMobileBackgroundUpdate): ${err}`)
          this.offlineMsgSvc.resumeRecvService()
        })
      }
    } else {
      console.log(`ERROR:(engine.js::handleMobileBackgroundUpdate): unable to call this.offlineMsgSvc.isReceiving()`)
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
  handleMobileNotifications (senderInfo) {
    const logPrefix = 'INFO(engine.js::handleMobileNotifications)'
    console.log(`${logPrefix}: received notification ${senderInfo}`)
    let contactsToCheck = undefined
    if (senderInfo) {
      contactsToCheck = this.contactMgr.getContactsWithMatchingPKMask(senderInfo)
    }


    // Compose a message to display to the user while we fetch messages related
    // to the notification we received:
    //
    let contactIdList = ''
    let numContacts = (contactsToCheck) ? contactsToCheck.length : 0
    for (let idxContact = 0; idxContact < numContacts; idxContact++) {
      contactIdList += contactsToCheck[idxContact].id + '👤 '
      if (idxContact < numContacts-1) {
        contactIdList += ' or '
      }
    }
    //
    let statusMsg = '✉️ 📲 Fetching new message(s)'
    if (contactIdList) {
      statusMsg += ` from ${contactIdList}`
    } // TODO: should this else to ' statusMsg += ' from new contact'
    this.reportStatus(statusMsg)

    if (this && this.offlineMsgSvc) {
      if (this.offlineMsgSvc.isReceiving()) {
        // TODO: -push the contact to the top of the queue.
        //       -optionally, wipe the bottome of the queue for faster results
        this.offlineMsgSvc.priorityReceiveMessages(contactsToCheck)
      } else {
        this.offlineMsgSvc.pauseRecvService()
        this.offlineMsgSvc.receiveMessages(contactsToCheck)
        .then(() => {
          this.offlineMsgSvc.resumeRecvService()
        })
        .catch((err) => {
          console.log(`ERROR:(engine.js::handleMobileNotifications): ${err}`)
          this.offlineMsgSvc.resumeRecvService()
        })
        console.log(`${logPrefix}: shortcutting offline message service with fast read.`)
      }
    }

    this.discovery.checkInvitations(this.contactMgr)
  }

  //
  //  Contact Management
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //
  handleSearchSelect (contact) {
    if (!contact || !contact.id || !this.contactMgr) {
      console.log('ERROR(engine.js::handleSearchSelect): contact or contactMgr undefined.')
      return
    }

    let selfAddCheck = false
    if (process.env.NODE_ENV === 'production' &&
        (contact.id !== 'alexc.id' ||
         contact.id !== 'alex.stealthy.id' ||
         contact.id !== 'relay.id')
        ) {
      selfAddCheck = (contact.id === this.userId)
    }
    if (this.contactMgr.isExistingContactId(contact.id) || selfAddCheck) {
      this.contactMgr.setActiveContact(contact)
      this.updateContactMgr()
      this.closeContactSearch()
    } else {
      this.handleContactAdd(contact)
    }
    this.emit('me-search-select-done', true)
  }

  async handleContactInvitation (theirPublicKey, theirUserId) {
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

  async handleContactAdd(contact, makeActiveContact = true) {
    const method = 'MessagingEngine::handleContactAdd'

    this.logger(`DEBUG(${method}): starting contact add for ${contact.id}.`)
    if (this.anonalytics) {
      this.anonalytics.aeContactAdded()
    }

    this.logger(`DEBUG(${method}): fetching public key ...`)
    let publicKey = contact.publicKey
    if (!publicKey) {
      try {
        publicKey = await this._fetchPublicKey(contact.id)
        this.logger(`Adding contact ${contact.id}. Read public key: ${publicKey}`)
      } catch (err) {
        this.logger(`Adding contact ${contact.id}. UNABLE TO READ PUBLIC KEY`)
      }
    }

    let isChannel = false
    let protocol
    let administrable = false
    if (ENABLE_CHANNELS_V2_0) {
      this.logger(`DEBUG(${method}): fetching channel protocol ...`)
      protocol = await this._fetchProtocol(contact.id)
      isChannel = utils.isChannelOrAma(protocol)

      // Check to see if we are an administrator on the channel we just added.
      //
      if (ENABLE_AMA && utils.isAma(protocol)) {
        // Fetch the Ama's owner.json and see if we're the owner.
        let owner = false
        let delegate = false

        try {
          const ownerDataStr = await this.io.robustRemoteRead(contact.id, AMA_OWNER_FILE)
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
            const delegateDataStr = await this.io.robustRemoteRead(contact.id, AMA_DELEGATES_FILE)
            delegateDataArr = JSON.parse(delegateDataStr)
          } catch (error) {
            console.log(`WARNING(${method}): failed to read channel delegate information.\n${error}`)
          }

          const pkLen = this.publicKey.length
          if (pkLen > 4) {
            const pkLast4 = this.publicKey.substr(pkLen - 4, pkLen)

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

    this.logger(`DEBUG(${method}): adding new contact ${contact.id} to contact manager ...`)
    this.contactMgr.addNewContact(contact, contact.id, publicKey, makeActiveContact)
    //
    // Grab the image for the new contact and put that into our contactImgs data structure:
    //
    if (contact.hasOwnProperty('image')) {
      const tempContact = {
        id: contact.id,
        image: contact.image,
        base64: ""
      }

      try {
        const headers = {}
        const res = await RNFetchBlob.fetch('GET', tempContact.image, headers)
        if (res && res.info() && (res.info().status === 200)) {
          tempContact.base64 = 'data:image/png;base64,' + res.base64()
        }
        this.contactsImgs.setContactImg(tempContact)
      } catch (error) {
        /* suppress */
      }
    }



    // We do the next part here to minimize the reading delay on protocol so that
    // when the contact is added and inserted into the offline messaging service, the
    // protocol and administrability are known and set.
    if (ENABLE_CHANNELS_V2_0) {
      if (protocol) {
        this.logger(`DEBUG(${method}): setting channel protocol ...`)
        this.contactMgr.setProtocol(contact.id, protocol)
      }
      if (administrable) {
        this.contactMgr.setAdministrable(contact.id, administrable)
      }
    }

    this.logger(`DEBUG(${method}): writing contact list (non blocking) ...`)
    this._writeContactList()

    this.logger(`DEBUG(${method}): creating conversation ...`)
    this.conversations.createConversation(contact.id)

    this.logger(`DEBUG(${method}): writing conversations (non blocking) ...`)
    this._writeConversations()

    if (ENABLE_CHANNELS_V2_0 && isChannel) {
      this.logger(`DEBUG(${method}): setting channel address in offline msg svc ...`)
      let msgAddress = {
        outerFolderNumber: 0,
        innerFolderNumber: 0,
        fileNumber: 0
      }
      this.offlineMsgSvc.addChannelAddress(contact.id, msgAddress)

      // Automatically send a message invite for channels that are added
      // -- this is used to increment/decrement the number of people in the room.
      //
      this.logger(`DEBUG(${method}): db invite contact (member incr, blocking) ...`)
      try {
        await this.discovery.inviteContact(publicKey)
      } catch (error) {
        // Suppress
        console.log(`ERROR(${method}): ${error}.`)
      }
    }

    this.logger(`DEBUG(${method}): updating contacts in offline messaging service ...`)
    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts())

    // TODO: Think about only doing this quick fetch for contact invitations (it
    // may also make sense for contact adds so I'm doing it all the time at present.)
    //
    // If the contact added was done through discovery, quickly fetch messages
    // from them:  (TODO: AC refactor this to common code with the other instance
    // of it.)
    const contactAdded = this.contactMgr.getContact(contact.id)
    const contactsToCheck = [contactAdded]

    // Compose a message to display to the user while we fetch messages related
    // to the notification we received:
    //
    let contactIdList = ''
    let numContacts = (contactsToCheck) ? contactsToCheck.length : 0
    for (let idxContact = 0; idxContact < numContacts; idxContact++) {
      contactIdList += contactsToCheck[idxContact].id + '👤 '
      if (idxContact < numContacts-1) {
        contactIdList += ' or '
      }
    }
    //
    let statusMsg = '✉️ 📲 Checking for new message(s)'
    if (contactIdList) {
      statusMsg += ` from ${contactIdList}`
    } // TODO: should this else to ' statusMsg += ' from new contact'
    this.reportStatus(statusMsg)

    if (contactAdded && this && this.offlineMsgSvc) {
      if (this.offlineMsgSvc.isReceiving()) {
        // TODO: -push the contact to the top of the queue.
        //       -optionally, wipe the bottome of the queue for faster results
        this.offlineMsgSvc.priorityReceiveMessages(contactsToCheck)
      } else {
        this.offlineMsgSvc.pauseRecvService()
        this.offlineMsgSvc.receiveMessages(contactsToCheck)
        .then(() => {
          this.offlineMsgSvc.resumeRecvService()
        })
        .catch((err) => {
          console.log(`ERROR:(${method}): ${err}`)
          this.offlineMsgSvc.resumeRecvService()
        })
        console.log(`DEBUG(${method}): shortcutting offline message service with fast read after discovery.`)
      }
    }

    // IMPORTANT (even for Prabhaav):
    // - Do not change the order of these updates. The UI depends on
    //   contact length changed to navigate to the ChatScreen. If you
    //   update messages last, it navigates to a screen with the wrong
    //   messages.
    this.logger(`DEBUG(${method}): updating messages (sends event 'me-update-messages') ...`)
    this.updateMessages(contact.id)

    this.logger(`DEBUG(${method}): updating contact manager (sends event 'me-update-contactmgr') ...`)
    this.updateContactMgr()

    this.logger(`DEBUG(${method}): close contact search (sends event 'me-close-contact-search') ...`)
    this.closeContactSearch()

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

    this.contactMgr.deleteContact(contact)
    this.contactsImgs.removeContactImg(contact.id)

    this._writeContactList()

    this.conversations.removeConversation(contact.id)
    this._writeConversations()

    this.offlineMsgSvc.removeMessages(contact)

    this.offlineMsgSvc.setContacts(this.contactMgr.getContacts())

    const activeUser = this.contactMgr.getActiveContact()
    if (activeUser) {
      const activeUserId = activeUser.id
      this.contactMgr.clearUnread(activeUserId)
    }

    this.updateContactMgr()
    this.updateMessages(activeUser ? activeUser.id : undefined)
  }

  handleContactMute(aContact, skipUpdateAndWrite=false) {
    if (aContact && aContact.id) {
      this.contactMgr.setNotifications(aContact.id, false)
      firebaseInstance.unsubscribeFromTopic(aContact.id)
      if (!skipUpdateAndWrite) {
        this.updateContactMgr()
        this._writeContactList()
      }
    }
  }

  handleContactUnmute(aContact) {
    if (aContact && aContact.id) {
      this.contactMgr.setNotifications(aContact.id)
      firebaseInstance.subscribeToTopic(aContact.id)
      this.updateContactMgr()
      this._writeContactList()
    }
  }

  handleRadio = async (e, { name }) => {
    if (name === 'analytics') {
      this.settings.toggleAnalytics()
      if (this.settings.getAnalytics()) {
        this.anonalytics.aeEnable()
      } else {
        this.anonalytics.aeDisable()
      }
    } else if (name === 'notifications') {
      const notificationPath = common.getDbNotificationPath(this.publicKey)
      await firebaseInstance.getFirebaseRef(`${notificationPath}`).once('value')
      .then((snapshot) => {
        const token = snapshot.child('token').val()
        this.settings.toggleNotifications()
        firebaseInstance.getFirebaseRef(`${notificationPath}`).set(
          {token, enabled: this.settings.getNotifications()})
      })
    } else if (name === 'discovery') {
      this.settings.toggleDiscovery()
      this.anonalytics.aeSettings(`discovery:${this.settings.getDiscovery()}`)
      if (this.settings.getDiscovery()) {
        if (!this.discovery) {
          this.discovery = new Discovery(this.userId, this.publicKey, this.privateKey)

          this.discovery.on('new-invitation',
                            (theirPublicKey, theirUserId) =>
                              this.handleContactInvitation(theirPublicKey, theirUserId))

          this.discovery.monitorInvitations()
        }
      } else {
        this.discovery.off('new-invitation')
        this.discovery.stop()
        this.discovery.clearDiscoveryDb()
        this.discovery = undefined
      }
    } // webrtc, heartbeat is ignored

    this.emit('me-update-settings', this.settings.getData())
    this.writeSettings()
  }

  async updateContactPubKey (aContactId) {
    const contact = this.contactMgr.getContact(aContactId)
    if (contact && !this.contactMgr.hasPublicKey(contact)) {
      let publicKey
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
        await this._writeContactList()
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
  handleOutgoingMessage = async (text, json = undefined) => {
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
        this.logger(`Fetched publicKey for ${outgoingUserId}.`)
      } catch (err) {
        console.log(`ERROR(engine.js::handleOutgoingMessage): unable to fetch public key. ${err}`)
        return
      }

      this.contactMgr.setPublicKey(outgoingUserId, outgoingPublicKey)
    }

    let amaCommand = false
    let displayInConversation = true
    const chatMsg = new ChatMessage()
    if (text) {
      // TODO: Change ama commands to use JSON directly (not type TEXT_JSON, but
      //       a new message type called JSON that is not directly supported for
      //       display so we don't need to rely on this workaround).
      amaCommand = AmaCommands.isAmaCommand(text)
      displayInConversation = !amaCommand

      chatMsg.init(this.userId, outgoingUserId, this._getNewMessageId(), text,
                   Date.now())
    } else {  // json
      chatMsg.init(this.userId, outgoingUserId, this._getNewMessageId(), json,
                   Date.now(), MESSAGE_TYPE.TEXT_JSON)
    }

    if (amaCommand) {
      // See if it's a question upvote and record this information to prevent the UI from
      // allowing re-upvoting
      //
      const amaObj = AmaCommands.getQuestionUpvoteObj(text)
      if (amaObj) {
        const amaId = parseInt(amaObj.ama_id)
        const questionId = parseInt(amaObj.question_id)

        if (!this.amaData.amaVoting.hasOwnProperty(amaId)) {
          this.amaData.amaVoting[amaId] = []
        }
        if (!this.amaData.amaVoting[amaId].includes(questionId)) {
          this.amaData.amaVoting[amaId].push(questionId)

          // No need to block on this write
          this.writeAmaData()
        }
      }

      // if (utils.isAndroid()) {
      //   const androidText = AmaCommands.getAndroidCmdTextWorkaround(text)
      //   chatMsg.content = androidText
      // }
    }

    this._sendOutgoingMessageOffline(chatMsg)
    this.anonalytics.aeMessageSent()
    if (this.discovery) {
      this.discovery.inviteContact(outgoingPublicKey)
    }

    if (displayInConversation) {
      this.conversations.addMessage(chatMsg)
      this._writeConversations()

      this.contactMgr.moveContactToTop(outgoingUserId)
      this.contactMgr.setSummary(outgoingUserId, ChatMessage.getSummary(chatMsg))
      this._writeContactList()

      this.updateContactMgr()
      this.updateMessages(outgoingUserId)
    }
  }

  // SO MUCH TODO TODO TODO
  //
  // Callers include anywhere messages arrive or change state to read:
  //    this.addIncomingMessages
  //    initialization method
  //    handleContactClick
  //
  sendMessageReceipts (theMessages) {
    if (!ENABLE_RECEIPTS) {
      return
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
    const receipts = {}

    if (theMessages && theMessages.length > 0) {
      for (const message of theMessages) {
        const fromId = message.from

        // If the message is from a channel, don't send read receipts:
        // TODO: unify the protocol constant
        if (utils.isChannelOrAma(this.contactMgr.getProtocol(fromId))) {
          continue
        }

        if (!(fromId in receipts)) {
          receipts[fromId] = {
            recipient: this.userId,
            receivedMsgIds: [],
            readMsgIds: []
          }
        }

        if (message.msgState === MESSAGE_STATE.SEEN) {
          receipts[fromId].readMsgIds.push(message.id)
        } else {  // SENT_OFFLINE or SENT_REALTIME
          receipts[fromId].receivedMsgIds.push(message.id)
        }
      }

      this.dispatchMessageReceipts(receipts)
    }

    const numReceipts = Object.keys(receipts)
    return numReceipts.length
  }

  dispatchMessageReceipts (theReceipts) {
    if (theReceipts) {
      for (const destId of Object.keys(theReceipts)) {
        const receipt = theReceipts[destId]
        const receiptMsg = new ChatMessage()
        receiptMsg.init(
            this.userId,
            destId,
            this._getNewMessageId(),
            receipt,
            Date.now(),
            MESSAGE_TYPE.RECEIPT
          )

        const destPublicKey = this.contactMgr.getPublicKey(destId)
        if (!destPublicKey) {
          this.logger(`ERROR: Unable to send receipts to ${destId}. No public key.`)
          continue
        }

        this._sendOutgoingMessageOffline(receiptMsg)
      }
    }
  }

  handleReceipt (aChatMsg) {
    if (!ENABLE_RECEIPTS) {
      return
    }

    if (aChatMsg.type !== MESSAGE_TYPE.RECEIPT) {
      this.logger('ERROR (handleReceipt): received non-receipt message.')
      return
    }

    const receiptObj = aChatMsg.content
    if (receiptObj) {
      // this.logger(`Processing receipt from ${aChatMsg.from}`);
      const recipientId = receiptObj.recipient
      const receivedMsgIds = receiptObj.receivedMsgIds
      const readMsgIds = receiptObj.readMsgIds

      //   1. mark message objects in the conversation manager appropriately.
      let needsSave = false

      const receivedMsgs =
        this.conversations.getSpecificMessages(recipientId, receivedMsgIds)
      for (const receivedMsg of receivedMsgs) {
        if ((receivedMsg.msgState !== MESSAGE_STATE.SEEN) ||
            (receivedMsg.msgState !== MESSAGE_STATE.RECEIVED)) {
          needsSave = true
          this.conversations.markConversationModified(receivedMsg)
          receivedMsg.msgState = MESSAGE_STATE.RECEIVED
        }
      }

      const readMsgs =
        this.conversations.getSpecificMessages(recipientId, readMsgIds)
      for (const readMsg of readMsgs) {
        if (readMsg.msgState !== MESSAGE_STATE.SEEN) {
          needsSave = true
          this.conversations.markConversationModified(readMsg)
          readMsg.msgState = MESSAGE_STATE.SEEN
        }
      }

      if (needsSave) {
        this._writeConversations()

        const ac = this.contactMgr.getActiveContact()
        const needsMsgListUpdate = ac && (recipientId === ac.id)
        if (needsMsgListUpdate) {
          this.updateMessages(recipientId)
        }
      }

      //   2. get the offline message service to delete any offline messages
      //      that have been read or received.
      let allMsgIds = []
      if (receivedMsgIds) {
        allMsgIds = allMsgIds.concat(receivedMsgIds)
      }
      if (readMsgIds) {
        allMsgIds = allMsgIds.concat(readMsgIds)
      }
      const recipient = this.contactMgr.getContact(recipientId)
      this.offlineMsgSvc.deleteMessagesFromStorage(recipient, allMsgIds)
    }
  }

  addIncomingMessages (messages) {
    for (const message of messages) {
      this.conversations.addMessage(message)
    }
    this._writeConversations()
  }

  updateContactOrderAndStatus (messages, writeContacts = true) {
    let updateActiveMsgs = false
    const lastMsgIdxStr = `${messages.length - 1}`
    for (const idx in messages) {
      const message = messages[idx]
      const incomingId = message.from

      // message.sent = true;

      // idx is a string representing the index (comparsion to length directly
      // fails since it's an int)
      const isLastOne = (idx === lastMsgIdxStr)
      const isActive = this.contactMgr.isActiveContactId(incomingId)

      this.contactMgr.setSummary(incomingId, ChatMessage.getSummary(message))

      if (isActive) {
        updateActiveMsgs = true
        message.seen = true
        message.msgState = MESSAGE_STATE.SEEN
        this.conversations.markConversationModified(message)
      } else {
        this.contactMgr.incrementUnread(incomingId)
      }

      if (isLastOne) {
        this.contactMgr.moveContactToTop(incomingId)
      }
    }

    if (updateActiveMsgs) {
      const activeId = this.contactMgr.getActiveContact()
        ? this.contactMgr.getActiveContact().id : undefined
      this.updateMessages(activeId)
    }

    if (writeContacts) {
      this._writeContactList()
    }

    this.updateContactMgr()
  }

  markReceivedMessagesSeen (aUserId) {
    let changesNeedSaving = false
    const isSelf = (this.userId === aUserId)
    const chatMessages = this.conversations.getMessages(aUserId)

    const seenMessages = []

    for (const chatMessage of chatMessages) {
      const received = (chatMessage.from !== this.userId) || isSelf
      if (received && (chatMessage.msgState !== MESSAGE_STATE.SEEN)) {
        changesNeedSaving = true
        this.conversations.markConversationModified(chatMessage)
        chatMessage.seen = true
        chatMessage.msgState = MESSAGE_STATE.SEEN
        seenMessages.push(chatMessage)
      }
    }

    if (changesNeedSaving) {
      this._writeConversations()
    }

    return seenMessages
  }

  handleContactClick = (contact) => {
    const handleCCTimer = new Timer('handleContactClick called')
    if (!contact && !this.forceActiveContact) {
      this.contactMgr.setActiveContact(undefined)
      this.updateContactMgr()
      handleCCTimer.logEvent('    after updateContactMgr for no contact and no forceActiveContact.')
      console.log(handleCCTimer.getEvents())
      return
    }

    const selectedUserId = contact.id
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
      this.contactMgr.setActiveContact(contact)
      // ACTODO: this method makes shit break...............
      this.contactMgr.clearUnread(selectedUserId)
      handleCCTimer.logEvent('    after setActiveContact and clearUnread.')

      const seenMessages = this.markReceivedMessagesSeen(selectedUserId)
      const numReceipts = this.sendMessageReceipts(seenMessages)
      handleCCTimer.logEvent(`    async sendMessageReceipts dispatched ${numReceipts} receipts`)

      this.updateContactMgr()
      handleCCTimer.logEvent(`    after updateContactMgr`)

      this.updateMessages(selectedUserId)
      handleCCTimer.logEvent(`    after updateMessages`)
    }
    // this.closeContactSearch();

    console.log(handleCCTimer.getEvents())
  }

  _sendOutgoingMessageOffline (aChatMsg) {
    const outgoingUserId = aChatMsg.to
    aChatMsg.msgState = MESSAGE_STATE.SENDING
    const contact = this.contactMgr.getContact(outgoingUserId)
    this.offlineMsgSvc.sendMessage(contact, aChatMsg)
  }

  //
  //  I/O & Persistence
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //

  // Receives requests to write the contact list. Waits until an existing write
  // has completed, then checks to see if a write is needed and proceeds to
  // write the contact list. (Prevents multiple duplicate calls from needlessly
  // writing--i.e. if writing takes longer than requests to write are coming in,
  // bundle them into fewer writes).
  async _writeContactList () {
    const method = 'MessagingEngine::_writeContactList'
    console.log(`INFO(${method}): called!`)

    if (this.writeContactListRequests !== 0) {
      // We're already saving the contact list so increment the request count
      // and exit.
      this.writeContactListRequests++
      console.log(`INFO(${method}): Already encrypting/writing contact list. Incremented outstanding requests to: ${this.writeContactListRequests}.`)
      return
    }

    // Increment request count to get the loop operating:
    this.writeContactListRequests = 1

    while (this.writeContactListRequests !== 0) {
      try {
        await this.___safeEncAndWriteContactList()
        if (this.loadedContactImages) {
          await this.___safeEncAndWriteContactsImgs()
        }
      } catch (error) {
        console.log(`S-ERROR(${method}): problem encrypting and writing contact list or contact images.\n${error}`)
      } finally {
        // Remove all requests except 1 if there are mulitple outstanding. If there
        // was only 1 request remaining, zero the count.
        this.writeContactListRequests = (this.writeContactListRequests > 1) ? 1 : 0
        console.log(`INFO(${method}): ${this.writeContactListRequests} requests outstanding after successful write.`)
      }
    }

  }

  async ___safeEncAndWriteContactList() {
    const method = 'MessagingEngine::___safeEncAndWriteContactList'
    console.log(`INFO(${method}): called!`)

    if (this.contactMgr.isContactArrModified()) {
      console.log(`INFO(${method}:   contactArr modified. Saving (saved=${this.contactMgr.getContactArrSaved()}, modified=${this.contactMgr.getContactArrModified()}))`)

      let tempContactsTimeObj = this.contacts.getTimeObj()
      let tempContactMgrTimeSaved = this.contactMgr.getContactArrSaved()
      try {
        const contactArr = this.contactMgr.getContacts()
        this.contacts.setContactArr(contactArr)
        this.contacts.setTimeBothSaved()
        this.contactMgr.setContactArrSaved()

        const encContactsData = await this.safeEncryptObj(this.contacts, ENCRYPT_CONTACTS)
        // TODO: these next two need to go in a promise.all block and also catch to ensure first fail doesn't happen
        //       same with other occurences of this pattern throughout
        await this.deviceIO.writeLocalFile(this.userId, CONTACTS_FILE, encContactsData)
        await this.io.robustLocalWrite(this.userId, CONTACTS_FILE, encContactsData)
      } catch (error) {
        const errStr = utils.fmtErrorStr(`failed to write ${CONTACTS_FILE}`, method, error)
        console.log(errStr)

        // Restore the time saved if we fail to save the contact list this time
        this.contactMgr.setContactArrSaved(tempContactMgrTimeSaved)
        this.contacts.restoreTimeObj(tempContactsTimeObj)
      }
    } else {
      console.log(`INFO(${method}:   contactArr not modified. Skipping write (saved=${this.contactMgr.getContactArrSaved()}, modified=${this.contactMgr.getContactArrModified()}))`)
    }
  }

  async ___safeEncAndWriteContactsImgs() {
    const method = 'MessagingEngine::___safeEncAndWriteContactsImgs'
    console.log(`INFO(${method}): called!`)

    if (this.contactsImgs.isModified()) {
      console.log(`INFO(${method}):   contactImgs modified. Saving.`)

      let tempContactsImgsTimeObj = this.contactsImgs.getTimeObj()
      try {
        this.contactsImgs.setTimeBothSaved()

        const encContactsImgsData = await this.safeEncryptObj(this.contactsImgs, true)
        await this.deviceIO.writeLocalFile(this.userId, CONTACTS_IMGS_FILE, encContactsImgsData)
        await this.io.robustLocalWrite(this.userId, CONTACTS_IMGS_FILE, encContactsImgsData)
      } catch (error) {
        const errStr = utils.fmtErrorStr(`failed to write ${CONTACTS_IMGS_FILE}`, method, error)
        console.log(errStr)

        // Restore the time saved if we fail to save the contact list this time
        this.contactsImgs.restoreTimeObj(tempContactsImgsTimeObj)
      }
    } else {
      console.log(`INFO(${method}:   contactImgs not modified. Skipping write.`)
    }
  }

  async safeEncryptObj(anObj, enCrypto=true, maxAttempts=3) {
    const method = 'MessagingEngine::safeEncryptObj'

    for (let attempt=0; attempt < maxAttempts; attempt++) {
      try {
        const encObj = await utils.encryptObj(this.publicKey, anObj, enCrypto)
        await utils.decryptObj(this.privateKey, encObj, enCrypto)
        return encObj
      } catch(error) {
        console.log(`INFO(${method}): encryption/decryption failed. Attempt ${attempt}.\n${error}`)
      }
    }

    throw(`ERROR(${method}): encryption / decryption failed after ${maxAttempts} attempts.`)
  }

  async _writeConversations () {
    const method = 'engine::_writeConversations'

    try {
      await this.conversations.storeContactBundles()
    } catch (error) {
      const errMsg = `WARNING(${method}): failure storing contact bundles.\n${error}`
      console.log(errMsg)
    }
  }

  async writeSettings() {
    const method = 'engine::writeSettings'

    if (this.settings) {
      let tempSettingsTimeObj = this.settings.getTimeObj()
      try {
        this.settings.setTimeBothSaved()
        const encSettingsStrObj = await this.safeEncryptObj(this.settings, ENCRYPT_SETTINGS)
        await this.deviceIO.writeLocalFile(this.userId, SETTINGS_FILE, encSettingsStrObj)
        await this.io.robustLocalWrite(this.userId, SETTINGS_FILE, encSettingsStrObj)
      } catch (error) {
        const errMsg = `ERROR(${method})-suppressed: failed to write settings.\n${error}`
        console.log(errMsg)

        // Restore the time saved if we fail to save settings this time:
        this.settings.restoreTimeObj(tempSettingsTimeObj)
      }
    }
  }

  //
  //  Miscellany
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  //

  // This method transforms engine formatted messages to gui formatted ones. TODO:
  // we should push this into the GUI or make the GUI work with the native format.
  _getMessageArray (aRecipientId) {
    const messages = []

    if (aRecipientId) {
      const recipient = this.contactMgr.getContact(aRecipientId)
      const recipientImageUrl = (recipient) ? recipient.image : undefined

      const chatMessages = this.conversations.getMessages(aRecipientId)
      for (const chatMessage of chatMessages) {
        const isMe = (chatMessage.from === this.userId)
        const msgAddress = (chatMessage.channel)
          ? chatMessage.channel.msgAddress : undefined
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
        }
        messages.push(message)
      }
    }

    return messages
  }

  _getNewMessageId () {
    // Try this for now--it might be good enough.
    return Date.now()
  }

  async _fetchPublicKey (aUserId) {
    return this.io.robustRemoteRead(aUserId, PUB_KEY_FILE)
  }

  getAnonalytics () {
    return this.anonalytics
  }

  // Stealthy Channel 2.0 Work:
  /// ///////////////////////////////////////////////////////////////////////////

  async _fetchProtocol (aUserId) {
    const method = 'MessagingEngine::_fetchProtocol'

    const maxAttempts = 5
    let stringifiedInfo
    try {
      console.log(`INFO(${method}): reading ${PROTOCOL_FILE}.`)
      stringifiedInfo = await this.io.robustRemoteRead(aUserId, PROTOCOL_FILE, maxAttempts)
    } catch (error) {
      // Supress: assume user is regular user, return undefined
      console.log(`ERROR(${method}): failed reading ${PROTOCOL_FILE} for ${aUserId}.\n  ${error}`)
      return undefined
    }

    if (stringifiedInfo) {
      try {
        console.log(`INFO(${method}): processing data from ${PROTOCOL_FILE}.\n  ${stringifiedInfo}\n`)
        const info = JSON.parse(stringifiedInfo)
        return `${info.protocol} ${info.version.major}.${info.version.minor}`
      } catch (error) {
        // Supress: assume user is regular user, return undefined
        console.log(`ERROR(${method}): failed processing data from ${PROTOCOL_FILE}.\n  ${error}`)
      }
    } else {
      console.log(`INFO(${method}): no data or ${PROTOCOL_FILE} doesn't exist.`)
    }

    return undefined
  }

  // aMessageTuple: {filePath, chatMsg, publicKey}
  async _sendChannelNotification (aMessageTuple) {
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

  async _addDefaultChannels () {
    const method = `engine::_addDefaultChannels`
    // const defaultChannelIds = ['hello.stealthy.id', 'ama.stealthy.id']
    const defaultChannelIds = ['hello.stealthy.id']

    for (const channelId of defaultChannelIds) {
      if (this.contactMgr.isExistingContactId(channelId)) {
        continue
      }

      try {
        const publicKey = await this._fetchPublicKey(channelId)
        await this.handleContactInvitation(publicKey, channelId)
      } catch (error) {
        // Suppress
        console.log(`WARNING(${method}): problem adding default channel ${channelId}.\n${error}.`)
        continue
      }
    }
  }

  // Stealthy AMA 1.0 Work:
  /// ///////////////////////////////////////////////////////////////////////////

  // Fetches the json data model for an AMA and pushes it out in an event.
  //
  async fetchAmaData (msgAddress, amaId, amaUserId) {
    const method = 'MessagingEngine::fetchAmaData'

    console.log(`INFO(${method}): msgAddress=${msgAddress}, amaId=${amaId}`)
    if (msgAddress && amaId) {
      const amaFilePath = ChannelServicesV2.getAmaFilePath(msgAddress)
      const amaDataStringified = await this.io.robustRemoteRead(amaUserId, amaFilePath)
      let amaData = {}
      try {
        amaData = JSON.parse(amaDataStringified)
      } catch (error) {
        // Suppress
      }

      this.annotateAmaData(amaData)

      this.emit('me-update-ama-data', amaData)
    } else {
      this.emit('me-update-ama-data', {})
    }
  }

  annotateAmaData (amaData) {
    if (amaData && amaData.id) {
      const amaId = amaData.id
      // Merge in locally stored voting data
      if (this.amaData.amaVoting.hasOwnProperty(amaId)) {
        const itemVoteIdArr = this.amaData.amaVoting[amaId]
        // TODO: consider deleting votes for questions that have been deleted
        for (const itemVote of itemVoteIdArr) {
          for (const question of amaData.ama) {
            if (question.question_id === itemVote) {
              question.voted = true
              break
            }
          }
        }
      }
    }
  }
}
