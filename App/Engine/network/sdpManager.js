const INVITE_FN = 'invite.json';
const RESPONSE_FN = 'response.json';

module.exports = class SdpManager {
  constructor(user, ioClassInst) {
    this.user = user;

    this.ioInst = ioClassInst;
  }

  writeSdpInvite(targetUser, sdpObj) {
    const inviteFileName = `${targetUser}/${INVITE_FN}`;
    return this.ioInst.writeLocalFile(this.user, inviteFileName, sdpObj);
  }

  readSdpInvite(targetUser) {
    const inviteFileName = `${this.user}/${INVITE_FN}`;
    return this.ioInst.readRemoteFile(targetUser, inviteFileName);
  }

  writeSdpResponse(targetUser, sdpObj) {
    const responseFileName = `${targetUser}/${RESPONSE_FN}`;
    return this.ioInst.writeLocalFile(this.user, responseFileName, sdpObj);
  }

  readSdpResponse(targetUser) {
    const responseFileName = `${this.user}/${RESPONSE_FN}`;
    return this.ioInst.readRemoteFile(targetUser, responseFileName);
  }

  deleteSdpInvite(targetUser) {
    const inviteFileName = `${targetUser}/${INVITE_FN}`;
    return this.ioInst.deleteLocalFile(this.user, inviteFileName);
  }

  deleteSdpResponse(targetUser) {
    const responseFileName = `${targetUser}/${RESPONSE_FN}`;
    return this.ioInst.deleteLocalFile(this.user, responseFileName);
  }
};
