const EventEmitter = require('EventEmitter');


const utils = require('./../misc/utils.js');

// HeartBeat:
//  Every minute, wake up and write an encrypted heartbeat file to each contact
//  we are associated with that we do not have a peer connection to.
//
//  Version 1.1 of a heartbeat file includes:
//  {
//    time: currentTimeUTC,
//  }
//
//  Future versions of the heartbeat file could include:
//  {
//    time: currentTimeUTC,
//    sdpInvite: serializedSdpInvite,
//    lastMessageId: idOfLastMessageInConversation,
//  }
//
const HB_INTERVAL = 30;
const HB_MONITOR_INTERVAL = 30;
const HB_FILE_NAME = 'hb.sesj';


class HeartBeat extends EventEmitter {
  constructor(logger,
              anIoDriver,
              aUserId,
              aContactArr,
              logOutput = false) {
    super();

    utils.throwIfUndef('logger', logger);
    utils.throwIfUndef('anIoDriver', anIoDriver);
    utils.throwIfUndef('aUserId', aUserId);
    utils.throwIfUndef('aContactArr', aContactArr);

    this.logger = logger;
    this.logOutput = logOutput;
    this.contactIdKeys = {};
    this.io = anIoDriver;
    this.userId = aUserId;

    this.enableBeat = false;
    this.firstBeat = true;

    this.enableMonitor = false;
    this.heartBeats = {};

    for (const contact of aContactArr) {
      if (utils.isDef(contact) && utils.isDef(contact.publicKey) && utils.isDef(contact.id)) {
        this.contactIdKeys[contact.id] = contact.publicKey;
        this.heartBeats[contact.id] = undefined;
      }
    }

    this.on('HeartBeat', this.writeHeartBeatFiles);
    this.on('HeartBeatMonitor', this.readHeartBeatFiles);
    this.on('firstBeatComplete', this.startMonitor);
  }

  // Convert node 'on' method to react 'addListener' method for RN EventEmitter
  on = (eventTypeStr, listenerFn, context) => {
    this.addListener(eventTypeStr, listenerFn, context);
  }

  log = (aString) => {
    if (this.logOutput) {
      this.logger(aString);
    }
  }

  addContact = (aContactId, aPublicKey) => {
    if (utils.isDef(aContactId) && utils.isDef(aPublicKey)) {
      this.contactIdKeys[aContactId] = aPublicKey;
      this.heartBeats[aContactId] = undefined;
    }
  }

  removeContact = (aContactId) => {
    if (!utils.isDef(aContactId)) {
      return;
    }
    if (aContactId in this.contactIdKeys) {
      delete this.contactIdKeys[aContactId];
    }
    if (aContactId in this.heartBeats) {
      delete this.heartBeats[aContactId];
    }
  }

  deleteContact = (aContactId) => {
    if (!utils.isDef(aContactId)) {
      return;
    }

    this.removeContact(aContactId);

    const filePath = `${aContactId}/${HB_FILE_NAME}`;
    this.io.deleteLocalFile(this.userId, filePath);
  }

  getHeartBeats = () => {
    return this.heartBeats;
  }

  getHeartBeat = (aUserId) => {
    if (utils.isDef(aUserId) && (aUserId in this.heartBeats)) {
      return this.heartBeats[aUserId];
    }
    return undefined;
  }

  startBeat = async () => {
    this.enableBeat = true;

    while (this.enableBeat) {
      this.log('HeartBeat!');
      this.emit('HeartBeat');

      if (this.firstBeat) {
        this.emit('firstBeatComplete');
        this.firstBeat = false;
      }

      const sleepForMs = (HB_INTERVAL * 1000);
      const sleepResult = await utils.resolveAfterMilliseconds(sleepForMs);
    }
  }

  stopBeat = () => {
    this.enableBeat = false;
  }

  startMonitor = async () => {
    this.log('Starting HeartBeat Monitor');
    this.enableMonitor = true;

    while (this.enableMonitor) {
      this.log('HeartBeat Monitor!');
      this.emit('HeartBeatMonitor');

      const sleepForMs = (HB_MONITOR_INTERVAL * 1000);
      const sleepResult = await utils.resolveAfterMilliseconds(sleepForMs);
    }
  }

  stopMonitor = async () => {
    this.enableMonitor = false;
  }

  writeHeartBeatFiles = () => {
    this.log('Write HeartBeat files!');

    return this.io.writeLocalFile(this.userId, HB_FILE_NAME, { time: Date.now() })
    .then(() => {
      this.log('HeartBeat successful.');
    })
    .catch((err) => {
      this.log(`ERROR: HeartBeat write failure. ${err}`);
    });
  }

  readHeartBeatFiles = () => {
    this.log('Read HeartBeat files!');
    const readPromises = [];
    for (const contactId in this.contactIdKeys) {
      const filePath = `${contactId}/${HB_FILE_NAME}`;
      try {
        const wrReadPromise = new Promise((resolve, reject) => {
          this.io.readRemoteFile(contactId, HB_FILE_NAME)
          .then((hbData) => {
            resolve({
              contactId: contactId,
              hbData: hbData,
            });
          })
          .catch((err) => {
            reject(err);
          });
        });

        readPromises.push(wrReadPromise);
      } catch (err) {
        this.logger('ERROR: reading heartbeat file ${filePath}. ${err}');
      }
    }

    return Promise.all(readPromises)
    .then((idDataPairs) => {
      this.log('HeartBeat Monitor cycle successful.');
      for (const idDataPair of idDataPairs) {
        if (!utils.isDef(idDataPair)) {
          continue;
        }

        const userId = idDataPair.contactId;
        const hbData = idDataPair.hbData;
        if (!utils.isDef(hbData) || utils.isEmptyObj(hbData)) {
          // value resolved to null or {} in readHeartBeatFiles
          // This happens when a heartbeat file does not exist for a user
          // or a user has deleted another user.
          continue;
        }
        this.heartBeats[userId] = hbData.time;
      }

      this.emit('monitor', this.heartBeats);
    })
    .catch((err) => {
      this.logger(`ERROR (Heartbeat Monitor): ${err}`);
      this.logger(`   WARNING: this error may be in code listening to emitted event 'monitor'`)
    });
  }

}
module.exports = { HeartBeat };
