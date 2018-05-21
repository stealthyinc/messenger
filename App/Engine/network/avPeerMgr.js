class AVPeerMgr {
  constructor(userId,
              targetUserId,
              initiator = false) {
    this.userId = userId;
    this.targetUserId = targetUserId;
    this.self = (this.userId === this.targetUserId);
    this.initiator = initiator;
    this.sdpInvite = undefined;
    this.sdpResponse = undefined;
    this.peerObjInitiator = undefined;
    this.peerObjResponder = undefined;
    this.stream = undefined;
  }

  getUserId() {
    return this.userId;
  }

  getTargetId() {
    return this.targetUserId;
  }

  setInitiator(isInitiator) {
    this.initiator = isInitiator;
  }

  isInitiator() {
    return this.initiator;
  }

  isSelf() {
    return this.self;
  }

  setPeerObjInitiator(aPeerObj) {
    this.peerObjInitiator = aPeerObj;
  }

  getPeerObjInitiator() {
    return this.peerObjInitiator;
  }

  setPeerObjResponder(aPeerObj) {
    this.peerObjResponder = aPeerObj;
  }

  getPeerObjResponder() {
    return this.peerObjResponder;
  }

  setPeerObj(aPeerObj) {
    if (this.initiator) {
      this.peerObjInitiator = aPeerObj;
    } else {
      this.peerObjResponder = aPeerObj;
    }
  }

  setSdpInvite(anSdpObj) {
    this.sdpInvite = anSdpObj;
  }

  getSdpInvite() {
    return this.sdpInvite;
  }

  setSdpResponse(anSdpObj) {
    this.sdpResponse = anSdpObj;
  }

  getSdpResponse() {
    return this.sdpResponse;
  }

  setStream(aStream) {
    this.stream = aStream;
  }

  close() {
    if (this.stream) {
      const vidTracks = this.stream.getVideoTracks();
      if (vidTracks && (vidTracks.length > 0)) {
        for (const vidTrack of vidTracks) {
          vidTrack.stop();
        }
      }

      const audTracks = this.stream.getAudioTracks();
      if (audTracks && (audTracks.length > 0)) {
        for (const audTrack of audTracks) {
          audTrack.stop();
        }
      }
    }

    if (this.peerObjInitiator) {
      this.peerObjInitiator.destroy();
    }

    if (this.peerObjResponder) {
      this.peerObjResponder.destroy();
    }
  }
}

module.exports = { AVPeerMgr };
