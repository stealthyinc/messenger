const utils = require('./utils.js');
const { firebaseInstance } = require('./../firebaseWrapper.js')
const common = require('./../../common.js');

class Discovery {
  constructor(aUserId, aPublicKey) {
    this.myUserId = aUserId
    this.publicKey = aPublicKey
  }

  // Updates the shared discovery structure with an invite if needed.
  // Shared discovery structure:
  //   ud/<their pk>/discovery/<our pk>
  //                                   blob: <enc id>
  //
  //   - If key <our pk> exists, nothing to do / no work.
  //   - If the key doesn't exist, we haven't connected to this person before or
  //     they deleted our thread and we need to send again.
  //
  async inviteContact(theirPublicKey) {
    if (!theirPublicKey) {
      throw(`ERROR(discovery.js::inviteContact): theirPublicKey unspecified.`)
    }

    try {
      const discoveryPath = `${common.getDbDiscoveryPath(theirPublicKey)}/${this.publicKey}`
      const discoveryRef = firebaseInstance.getFirebaseRef(discoveryPath)

      const snapshot = await discoveryRef.once('value')
      if (snapshot && snapshot.val()) {
        return
      }

      const encUserId = await utils.encrypt(theirPublicKey, this.myUserId)
      const encUserIdStr = JSON.stringify(encUserId)
      const result = await discoveryRef.set(encUserIdStr)
    } catch (err) {
      console.log(`ERROR(discovery.js::inviteContact): ${err}`)
    }

    return
  }
}

module.exports = { Discovery };
