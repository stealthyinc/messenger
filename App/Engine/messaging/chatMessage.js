// TODO: Going forward, look into making this XMPP using their spec. etc.
//

// Non-XMPP:
const MESSAGE_TYPE = {
  TEXT: 0,
  VIDEO_SDP: 1,
  DATA: 2,
  RECEIPT: 3,
  SCREEN_SHARE_SDP: 4,
};

// RECEIVED is not used in the UI, but is used by the core to perform message
//          deletion.
// SENDING is the default state in the GUI.
//
const MESSAGE_STATE = {
  UNDEFINED: '',
  SENDING: 'sending',
  SENT_REALTIME: 'sentRealtime',
  SENT_OFFLINE: 'sentOffline',
  RECEIVED: 'received',
  SEEN: 'seen',
};

class ChatMessage {
  constructor() {
    this.from = undefined;
    this.to = undefined;
    this.id = undefined;
    this.content = undefined;

    this.time = undefined;
    // this.timeRcvd = timeRcvd;
    this.sent = undefined;
    this.seen = undefined;
    this.type = undefined;

    this.msgState = MESSAGE_STATE.UNDEFINED;
  }

  init(
    from = undefined,
    to = undefined,
    id = undefined,
    content = undefined,
    //
    // Non-XMPP:
    time = undefined,
    // timeRcvd = undefined,
    type = MESSAGE_TYPE.TEXT,
    sent = false,
    seen = false,
    msgState = MESSAGE_STATE.UNDEFINED,
    // gaia=undefined,  // i.e. is stored? (archived is taken below)
    //
    // Future (XMPP):
    // format=undefined,
    // state=undefined,
    // delay=undefined,
    // archived=undefined,
  ) {
    this.from = from;
    this.to = to;
    this.id = id;
    this.content = content;

    this.time = time;
    // this.timeRcvd = timeRcvd;
    this.sent = sent;
    this.seen = seen;
    this.type = type;

    this.msgState = msgState;
  }

  clone(aChatMessage) {
    this.from = aChatMessage.from;
    this.to = aChatMessage.to;
    this.id = aChatMessage.id;
    this.content = aChatMessage.content;

    this.time = aChatMessage.time;
    this.sent = aChatMessage.sent;
    this.seen = aChatMessage.seen;
    this.type = aChatMessage.type;

    this.msgState = aChatMessage.msgState;
  }
}

module.exports = { MESSAGE_TYPE, MESSAGE_STATE, ChatMessage };
