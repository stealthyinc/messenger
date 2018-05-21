// A class to handle multiple peers per userId to solve the problem of
// clobbering double invite situations (i.e. each user sends an invite
// but the peer infrastructure can only handle one).
//
// This is a temporary fix and can't scale to support multiple browsers etc.
//
// Example internal structure of this.peers:
//
//   this.peers = {
//     alexc.id: {
//       offer: undefined,
//       response: {
//         connected: false,
//         object: { an SDP object ...}
//       }
//     }
//   }
const utils = require('./utils.js');


const RESPONSE_TYPE = 'response';
const OFFER_TYPE = 'offer';
const PEER_OBJ_TYPES = [RESPONSE_TYPE, OFFER_TYPE];

class PeerManager {
  constructor(logger) {
    this.logger = logger;
    this.peers = {};
  }

  addOfferPeer(aUserId, aPeerObj, isConnected = false) {
    this.addPeer(aUserId, aPeerObj, OFFER_TYPE, isConnected);
  }

  addResponsePeer(aUserId, aPeerObj, isConnected = false) {
    this.addPeer(aUserId, aPeerObj, RESPONSE_TYPE, isConnected);
  }

  addPeer(aUserId, aPeerObj, aPeerObjType, isConnected = false) {
    PeerManager._throwIfInvalidType(aPeerObjType);

    this.logger(`addPeer: ${aUserId} ${aPeerObjType}.`);

    if (!(aUserId in this.peers)) {
      // Initialize this property:
      this.peers[aUserId] = {};
      this.peers[aUserId][OFFER_TYPE] = undefined;
      this.peers[aUserId][RESPONSE_TYPE] = undefined;
    }

    if (this.peers[aUserId][aPeerObjType]) {
      // Destroy this peer:
      const peerToDelete = this.peers[aUserId][aPeerObjType];
      if (peerToDelete.object) {
        this.logger(`Destroying existing peer in call to addPeer: ${aUserId} ${aPeerObjType}.`);
        peerToDelete.object.destroy();
      }
    }

    this.peers[aUserId][aPeerObjType] = {
      connected: isConnected,
      object: aPeerObj,
    };
  }

  removePeer(aUserId, aPeerObjType) {
    if (!(aUserId in this.peers) ||
        !this.peers[aUserId][aPeerObjType]) {
      return;
    }

    this.logger(`removePeer: ${aUserId} ${aPeerObjType}.`);

    const peerToDelete = this.peers[aUserId][aPeerObjType];
    if (peerToDelete.object) {
      this.logger(`Destroying peer in call to removePeer: ${aUserId} ${aPeerObjType}.`);
      peerToDelete.object.destroy();
    }
    // Overkill?
    delete this.peers[aUserId][aPeerObjType];
    this.peers[aUserId][aPeerObjType] = undefined;
  }

  removePeerAllTypes(aUserId) {
    for (const type of PEER_OBJ_TYPES) {
      this.removePeer(aUserId, type);
    }
  }

  setPeerConnected(aUserId, aPeerObjType) {
    this._throwIfUndefined(aUserId, aPeerObjType, 'setPeerConnected');
    this.peers[aUserId][aPeerObjType].connected = true;
  }

  setPeerDisconnected(aUserId, aPeerObjType) {
    this._throwIfUndefined(aUserId, aPeerObjType, 'setPeerDisconnected');
    this.peers[aUserId][aPeerObjType].connected = false;
  }

  getPeerObj(aUserId, aPeerObjType) {
    this._throwIfUndefined(aUserId, aPeerObjType, 'getPeerObj');
    return this.peers[aUserId][aPeerObjType].object;
  }

  isPeerConnected(aUserId, aPeerObjType) {
    if (aUserId in this.peers) {
      const peer = this.peers[aUserId];
      if (peer) {
        const peerOfType = peer[aPeerObjType];
        if (peerOfType) {
          return peerOfType.object && peerOfType.connected;
        }
      }
    }
    return false;
  }

  isUserConnected(aUserId) {
    return this.isPeerConnected(aUserId, RESPONSE_TYPE) ||
           this.isPeerConnected(aUserId, OFFER_TYPE);
  }

  getConnection(aUserId) {
    for (const type of PEER_OBJ_TYPES) {
      if (this.isPeerConnected(aUserId, type)) {
        return this.getPeerObj(aUserId, type);
      }
    }
    return undefined;
  }

  destroyPeers() {
    if (!utils.isEmptyObj(this.peers)) {
      const objKeys = Object.keys(this.peers);
      for (const key of objKeys) {
        const peerObj = this.peers[key];
        if (peerObj) {
          for (const type of PEER_OBJ_TYPES) {
            this.removePeer(key, type);
            // if (peerObj[type] &&
            //     peerObj[type].object) {
            //   peerObj[type].object.destroy();
          }
        }
      }
    }
    this.peers = {};
  }

  _throwIfDefined(aUserId, aPeerObjType, aMethodName) {
    if (aUserId in this.peers &&
        this.peers[aUserId][aPeerObjType]) {
      throw (`ERROR: In call to ${aMethodName}, ${aUserId}, ${aPeerObjType} is already defined.`);
    }
  }

  _throwIfUndefined(aUserId, aPeerObjType, aMethodName) {
    if (!(aUserId in this.peers) ||
        !this.peers[aUserId][aPeerObjType]) {
      throw (`ERROR: In call to ${aMethodName}, ${aUserId}, ${aPeerObjType} is not defined.`);
    }
  }

  static _throwIfInvalidType(aType) {
    if (!PEER_OBJ_TYPES.includes(aType)) {
      throw (`ERROR: Invalid type ${aType} in PeerManager.`);
    }
  }
}

module.exports = {
  RESPONSE_TYPE,
  OFFER_TYPE,
  PEER_OBJ_TYPES,
  PeerManager,
};
