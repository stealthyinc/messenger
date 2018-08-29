// Notes:
// This class is a placeholder to isolate the engine from platform differences
// between react and react native, web client vs. web server etc.
//
class StealthyIndexReader {
  constructor(aUserId, aPrivateKey, anIoInst, anAppUrl) {}
  getIndexData() { return undefined }
  async readIndexData() { return undefined }
}

class Graphite {
  constructor(ioClassInst, localUserId, privateKey) {}
  getIndexData() { return undefined }
  async readIndexData() { return undefined }
}

module.exports = { StealthyIndexReader, Graphite }
