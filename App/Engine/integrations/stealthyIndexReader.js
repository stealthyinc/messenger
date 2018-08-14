const utils = require('./../misc/utils.js')

// Abstract base class for file-based integration with other dApps
//
//   Pattern from: https://ilikekillnerds.com/2015/06/abstract-classes-in-javascript/
//
class StealthyIndexReader {
  constructor(aUserId, aPrivateKey, anIoInst, anAppUrl) {
    utils.throwIfUndef('aUserId', aUserId)
    utils.throwIfUndef('aPrivateKey', aPrivateKey)
    utils.throwIfUndef('anIoInst', anIoInst)
    utils.throwIfUndef('anAppUrl', anAppUrl)

    this.userId = aUserId
    this.privateKey = aPrivateKey
    this.ioInst = anIoInst
    this.appUrl = anAppUrl

    this.indexData = undefined
  }

  getIndexData() {
    return this.indexData
  }

  async readIndexData() {
    try {
      this.indexData = await this._readIndexFile()
    } catch (error) {
      throw(`ERROR(StealthyIndex:readIndexData): unable to read index data from index file.\n${error}`)
    }

    return this.indexData
  }


  //
  // Private:
  ////////////////////////////////////////////////////////////////////////////////

  async _readIndexFile(indexFileName = 'stealthyIndex.json') {
    const method = 'StealthyIndex::_readIndexFile'

    let cipherTextObjStr = undefined
    try {
      cipherTextObjStr = await this.ioInst.readPartnerAppFile(
        this.userId, indexFileName, this.appUrl)
    } catch(error) {
      throw `ERROR(${method}): Reading ${indexFileName} from ${this.userId}'s' ${this.appUrl} GAIA failed.\n${error}`
    }

    // No file present, return undefined
    if (!cipherTextObjStr) {
      return undefined
    }

    let recovered = undefined
    try {
      recovered = await utils.decryptObj(this.privateKey, cipherTextObjStr, true)
    } catch(error) {
      throw `ERROR(${method}): Decrypting ${indexFileName} from ${this.userId}'s ${this.appUrl} GAIA failed'.\n${error}`
    }

    return recovered
  }
}

module.exports = { StealthyIndexReader }
