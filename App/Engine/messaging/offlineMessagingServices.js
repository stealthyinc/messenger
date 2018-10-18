const { EventEmitterAdapter } = require('./../platform/reactNative/eventEmitterAdapter.js')

const utils = require('./../misc/utils.js');
const { MESSAGE_STATE } = require('./chatMessage.js');

const ENABLE_CHANNELS_V2_0 = true
const { ChannelServicesV2 } = require('./channelServicesV2.js')

const ENABLE_SEND_QUEUEING = false;
const SEND_INTERVAL = 5;
const RECV_INTERVAL = 5;
const SHORT_RECV_INTERVAL = 2;


const EXT_SEP = '.';
const EXT_SEP_FB = '_';
const OFFLINE_MSG_EXT = 'cm';

function _throwIfUndef(aVarName, aVar) {
  if (aVar === undefined) {
    throw `${aVarName} is undefined`;
  }
}

class OfflineMessages {
  constructor(aUserId) {
    this.messages = {};
    this.user;
  }

  addMessage(aChatMsg) {
    if (aChatMsg) {
      const contactId = aChatMsg.from;
      const msgId = aChatMsg.id;

      if (!this.messages.hasOwnProperty(contactId)) {
        this.messages[contactId] = {};
      }

      if (!this.messages[contactId].hasOwnProperty(msgId)) {
        this.messages[contactId][msgId] = aChatMsg;
        return true;
      }
    }
    return false;
  }

  deleteMessage(aContactId, aMessageId) {
    if (this.hasMessage(aContactId, aMessageId)) {
      delete this.messages[aContactId][aMessageId];
    }
  }

  hasMessage(aContactId, aMessageId) {
    if (this.messages.hasOwnProperty(aContactId)) {
      if (this.messages[aContactId].hasOwnProperty(aMessageId)) {
        return true;
      }
    }
    return false;
  }

  getMessages(aContactId) {
    const messageIds = this.getMessageIds(aContactId);
    const messages = [];
    for (const messageId of messageIds) {
      const message = this.messages[aContactId][messageId];
      messages.push(message);
    }

    return (messages.sort(OfflineMessages._compareMessages));
  }

  // Gets messages from all users sorted in time order.
  //
  getAllMessages() {
    const allMessages = [];
    for (const userId of Object.keys(this.messages)) {
      const messagesById = this.messages[userId];
      for (const msgId of Object.keys(messagesById)) {
        const message = messagesById[msgId];
        allMessages.push(message);
      }
    }

    allMessages.sort(OfflineMessages._compareMessages);
    return allMessages;
  }

  getMessageIds(aContactId) {
    if (this.messages.hasOwnProperty(aContactId)) {
      return Object.keys(this.messages[aContactId]);
    }

    return [];
  }

  removeUntrackedContacts(aContactArr) {
    const contactIds = [];
    for (const contact of aContactArr) {
      contactIds.push(contact.id);
    }

    for (const trackedContactId of Object.keys(this.messages)) {
      if (!contactIds.includes(trackedContactId)) {
        delete this.messages[trackedContactId];
      }
    }
  }

  static _compareMessages(msgA, msgB) {
    return msgA.id - msgB.id;
  }
}


class OfflineMessagingServices extends EventEmitterAdapter {
  constructor(aLogger,
              aUserId,
              anIdxIoInst,
              anIoInst,
              aContactArr,
              logOutput = false) {
    super();

    _throwIfUndef('aLogger', aLogger);
    _throwIfUndef('aUserId', aUserId);
    _throwIfUndef('anIdxIoInst', anIdxIoInst);

    this.logger = aLogger;
    this.logOutput = logOutput;
    this.userId = aUserId;
    this.idxIoInst = anIdxIoInst;
    this.ioInst = anIoInst

    this.skipSend = false;
    this.enableSendService = false;
    this.writeQueue = [];

    this.enableRecvService = false;
    this.rcvdOfflineMsgs = new OfflineMessages();
    this.contactArr = aContactArr;

    // An object that stores an arrays of message IDs read offline by each user.
    this.offlineMsgIdsMarkedAsRead = {};

    // Needed to mark bundles as dirty when message sent offline (if we remove
    // queueing altogether), move this code to where sendMessage gets called in
    // workers.
    this.conversations = undefined;

    // This boolean tracks whether we're already writing files to prevent
    // index file clobbering. It causes sendMessagesToStorage calls to be ignored
    // because a call to this method is already working on the queue.
    this.sending = false;

    // This boolean tracks whether we're reading files to get offline messages.
    // It is used for mobile when a notification is rx and we want to just fetch
    // a msg from one user.
    this.receiving = false;

    this.skipRecvService = false;

    this.channelAddresses = {}
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  setChannelAddresses(theChannelAddresses) {
    this.channelAddresses = theChannelAddresses
  }

  addChannelAddress(aUserId, theChannelAddress) {
    if (!this.channelAddresses) {
      this.channelAddresses = {}
    }
    this.channelAddresses[aUserId] = theChannelAddress
  }

  setContacts(aContactArr) {
    this.contactArr = aContactArr;
    this.rcvdOfflineMsgs.removeUntrackedContacts(aContactArr);
  }

  setConversationManager(theConversations) {
    this.conversations = theConversations;
  }

  // TODO: this probably needs to be blocking so that multiple writes to the
  //       same area don't clobber the index file.  (e.g. user types two messages
  //       quickly, but one is not yet done writing and over-writes the index file.)
  //
  // More Info: This works properly when it's done with the timer (send queueing),
  //            but does clobber the index file when sendMessagesToStorage is called
  //            as a promise with or without an 'await'. It probably works with the
  //            timer because there is enough time that the number of messages
  //            would always be written before a subsequent call to sendMessagesToStorage.
  //
  async sendMessage(aContact, aChatMsg) {
    const isFirebase = this.idxIoInst.isFirebase();
    const sep = (isFirebase) ? EXT_SEP_FB : EXT_SEP;
    const fileName = `${aChatMsg.id}${sep}${OFFLINE_MSG_EXT}`;
    const filePath = `${aContact.id}/conversations/offline/${fileName}`;

    const hasPublicKey = (aContact.publicKey) ? (aContact.publicKey !== '') : false;
    if (!hasPublicKey) {
      throw `ERROR(offlineMessagingServices::sendMessage): unable to send message to ${aContact.id}. No public key available.`;
    }

    this.writeQueue.push({
      filePath,
      chatMsg: aChatMsg,
      publicKey: aContact.publicKey,
    });

    if (!ENABLE_SEND_QUEUEING &&
        this.conversations) {
        this.sendMessagesToStorage();
    }
  }

  removeMessages(aContact) {
    const dirPath = `${aContact.id}/conversations/offline`;

    // TODO: refactor this.
    // Rip any messages from this contact out of the queue.
    this.skipSend = true;
    const indicesToRemove = [];
    let index = 0;
    for (const messageTuple of this.writeQueue) {
      if (messageTuple.chatMsg &&
          (messageTuple.chatMsg.to === aContact.id)) {
        indicesToRemove.unshift(index);
      }
      index++;
    }
    if (indicesToRemove.length > 0) {
      for (const indexToRm of indicesToRemove) {
        this.writeQueue.splice(indexToRm, 1);
      }
    }
    this.skipSend = false;

    this.idxIoInst.deleteLocalDir(dirPath, aContact.publicKey);
  }

  deleteMessagesFromStorage(aContact, aMessageIdList) {
    const isFirebase = this.idxIoInst.isFirebase();
    const sep = (isFirebase) ? EXT_SEP_FB : EXT_SEP;

    const dirPath = `${aContact.id}/conversations/offline`;

    const fileList = [];
    for (const msgId of aMessageIdList) {
      fileList.push(`${msgId}${sep}${OFFLINE_MSG_EXT}`);
    }

    this.idxIoInst.deleteLocalFiles(dirPath, fileList, aContact.publicKey);
  }

  async sendMessagesToStorage() {
    if (this.sending) {
      return;
    }
    this.sending = true;

    try {
      this.log('Offline Messaging Send Service:');

      let count = 0;
      if (this.conversations) {
        while (this.writeQueue.length > 0) {
          const messageTupleArr = this.writeQueue.splice(0, 1);
          const messageTuple = messageTupleArr[0];

          messageTuple.chatMsg.msgState = MESSAGE_STATE.SENT_OFFLINE;
          // Can probably move this call out of here and use the emit below
          // to handle it (emit with a collection of message Ids or something).
          // TODO: move this to whatever handles the emit below (not this directly,
          //       but conversations and the call--it's ugly that it's in here)
          this.conversations.markConversationModified(messageTuple.chatMsg);

          this.log(`   sending message offline to ${messageTuple.chatMsg.to}`);
          this.log(`   (filepath = ${messageTuple.filePath})`);

          await this.idxIoInst.seqWriteLocalFile(messageTuple.filePath,
                                              messageTuple.chatMsg,
                                              messageTuple.publicKey);

          this.emit('offline message written', messageTuple)

          this.log(`   done sending offline message ${messageTuple.filePath}`);
          count++;
        }
      }

      if (count > 0) {
        // Kick of an event to update the messages gui as we've changed
        // message status fields in memory held by MessagePage::conversations.
        this.emit('offline messages sent');

        this.log(`   sent ${count} offline messages. Sleeping ${SEND_INTERVAL}s.`);
      }
    } catch(err) {
      // TODO:
      //   - emit an error to indicate the message failed to send (i.e an event
      //     emit with more data)
      //
      // Catch is here to ensure sending gets set to false when while loop
      // completes or fails.
      console.log(`ERROR: ${err}`);
    }

    this.sending = false;
  }

  async startSendService() {
    this.enableSendService = ENABLE_SEND_QUEUEING;
    while (this.enableSendService) {
      if (!this.skipSend) {
        this.sendMessagesToStorage();
      }

      const sleepResult = await utils.resolveAfterMilliseconds(SEND_INTERVAL * 1000);
    }
  }

  skipSendService(skip = true) {
    this.skipSend = skip;
  }

  stopSendService() {
    this.enableSendService = false;
  }

  isReceiving = () => {
    return this.receiving;
  }

  static _getNameMinusExtension(aFileName, isFirebase = false) {
    const extSep = (isFirebase) ? EXT_SEP_FB : EXT_SEP;
    const idx = aFileName.lastIndexOf(extSep);
    if (idx !== -1) {
      return aFileName.substr(0, idx);
    }

    return aFileName;
  }

  async startRecvService() {
    // Don't run the loop twice if we're already running (i.e. loop is singlton)
    if (this.enableRecvService) {
      return;
    }

    this.enableRecvService = true;
    while (this.enableRecvService) {
      if (!this.skipRecvService) {
        this.log('Offline Messaging Receive Service:');
        this.receiving = true;
        await this.receiveMessages();
        this.receiving = false;
      }

      if (this.contactArr && this.contactArr.length <= 5) {
        const sleepResult = await utils.resolveAfterMilliseconds(SHORT_RECV_INTERVAL * 1000);
      } else {
        const sleepResult = await utils.resolveAfterMilliseconds(RECV_INTERVAL * 1000);
      }
    }
  }

  pauseRecvService() {
    this.skipRecvService = true;
  }

  resumeRecvService() {
    this.skipRecvService = false;
  }

  async receiveMessages(contacts) {
    if (!contacts || contacts.length === 0) {
       contacts = this.contactArr
    }

    const isFirebase = this.idxIoInst.isFirebase();
    const chatMessagesReadPromises = [];

    for (const contact of contacts) {
      // TODO: refactor proocol constants
      if (contact.protocol && utils.isChannelOrAma(contact.protocol)) {
        if (!ENABLE_CHANNELS_V2_0) {
          continue
        }

        const contactId = contact.id

        let remoteStatusData = undefined
        try {
          const stringifiedStatusData =
            await this.ioInst.robustRemoteRead(contactId, ChannelServicesV2.getStatusFilePath())
          remoteStatusData = JSON.parse(stringifiedStatusData)
          if (!remoteStatusData) {
            continue
          }
        } catch (error) {
          // Suppress
          // throw `ERROR(${method}): failed to read ${ChannelServicesV2.getStatusFilePath()}.\n${error}`
          continue
        }

        // TODO: optimize so we're not creating this every time. First get it working
        //       though
        const channelMgr = new ChannelServicesV2()
        channelMgr.setLastMsgAddress(remoteStatusData)
        const messageFilePaths = channelMgr.getMsgFilePaths(this.channelAddresses[contactId])

        for (const messageFilePath of messageFilePaths) {
          console.log(`messageFilePath: ${messageFilePath}`)
          chatMessagesReadPromises.push(
            new Promise((resolve, reject) => {
              this.ioInst.robustRemoteRead(contactId, messageFilePath)
              .then((data) => {
                let channelChatMsg = undefined
                try {
                  channelChatMsg = JSON.parse(data)
                } catch(error) {
                  // Suppress
                }
                resolve(channelChatMsg)
              })
              .catch((error) => {
                resolve(undefined)
              })
            })
          )
        }
      } else {
        // Using Contact obj. here for future expansion w.r.t. heartBeat.
        const contactId = contact.id;
        const offlineDirPath = `${this.userId}/conversations/offline`;

        let indexData = undefined;
        try {
          indexData = await this.idxIoInst.readRemoteIndex(contactId, offlineDirPath);
          this.log(`   Finished reading remote index of ${contactId} (${offlineDirPath}).`);
        } catch (err) {
          // Suppress 404 for users who haven't written a sharedIndex yet.
          // Also suppress errors here as they do not effect stored data (i.e. a
          // subsequent read will pick up where this failure occurred)
        }

        if (indexData && indexData.active) {
          for (const chatMsgFileName in indexData.active) {
            const msgIdForFile = OfflineMessagingServices._getNameMinusExtension(chatMsgFileName, isFirebase);
            if (!this.rcvdOfflineMsgs.hasMessage(contactId, msgIdForFile)) {
              const chatMsgFilePath = `${offlineDirPath}/${chatMsgFileName}`;

              // Add the promise with a catch to bypass the fail fast behavior of Promise.all below
              chatMessagesReadPromises.push(
                this.idxIoInst.readRemoteFile(contactId, chatMsgFilePath)
                .catch(error => {
                  console.log(`INFO(offlineMessagingServices): unable to read ${chatMsgFilePath} from ${contactId}.\n  ERROR reported: ${error}`);
                  return undefined
                })
              );
            }
          }
        }
      }
    }

    return Promise.all(chatMessagesReadPromises)
    .then((chatMessageObjs) => {
      let count = 0;
      for (const chatMsg of chatMessageObjs) {
        // Check if chatMsg is defined too (failed reads make it undefined)
        if (chatMsg && this.rcvdOfflineMsgs.addMessage(chatMsg)) {
          count++;
        }
      }

      if (count) {
        this.log(`   received ${count} offline messages.`);
        const allMessages = this.rcvdOfflineMsgs.getAllMessages();
        this.emit('new messages', allMessages);
      }
      return;
    })
    .catch((err) => {
      this.logger(`ERROR: offline messaging services failed to read chat messages.\n${err}.`);
      return;
    });
  }

  stopRecvService() {
    this.enableRecvService = false;
  }
}


module.exports = { OfflineMessagingServices };
