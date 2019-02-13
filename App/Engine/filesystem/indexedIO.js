const utils = require('./../misc/utils.js')
const FirebaseIO = require('./firebaseIO.js')

const INDEX_NAME = 'index.json'
const SHARED_INDEX_NAME = 'sharedIndex.json'

const ENABLE_SEQ_WR_RD_DLY = true

class IndexedIO {
  constructor (logger,
              ioClassInst,
              localUserId,
              localUserPrivateKey,
              localUserPublicKey,
              useEncryption) {
    // TODO: TypeError if ioClassInst is not gaiaIO or firebaseIO.
    this.logger = logger

    if (ioClassInst) {
      this.ioInst = ioClassInst
      this.userId = localUserId
      this.privateKey = localUserPrivateKey
      this.publicKey = localUserPublicKey
      this.useEncryption = useEncryption
      return
    }

    throw 'ERROR(IndexedIO): ioClassInst is not defined.'
  }

// For testing
  isFirebase () {
    if (this.ioInst) {
      return (this.ioInst instanceof FirebaseIO)
    }
    return false
  }

// Index File API
// //////////////////////////////////////////////////////////////////////////////

  // Reads a remote index file encrypted for this client's user. Decrypts it
  // and returns the index data.
  //
  async readRemoteIndex (remoteUser, dirPath) {
    const method = 'IndexedIO::readRemoteIndex'
    IndexedIO._checkFilePath(dirPath)

    const indexFilePath = `${dirPath}/${SHARED_INDEX_NAME}`
    let sharedIndexData
    try {
      sharedIndexData = await this.ioInst.readRemoteFile(
        remoteUser, indexFilePath)

      if (!sharedIndexData) {
        return undefined
      }
    } catch (error) {
      throw utils.fmtErrorStr(`failed to read ${indexFilePath}.`, method, error)
    }

    try {
      return await utils.decryptObj(
        this.privateKey, sharedIndexData, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to decrypt ${indexFilePath}.\n`,
        method, error)
    }
  }

  // Reads a local index file encrypted for this client's user. Decrypts it
  // and returns the index data.
  //
  async readLocalIndex (dirPath) {
    const method = 'IndexedIO::readLocalIndex'
    IndexedIO._checkFilePath(dirPath)

    const indexFilePath = `${dirPath}/${INDEX_NAME}`
    let indexData
    try {
      indexData = await this.ioInst.readLocalFile(this.userId, indexFilePath)

      if (!indexData) {
        return undefined
      }
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read index ${indexFilePath}.`,
        method, error)
    }

    try {
      return await utils.decryptObj(
        this.privateKey, indexData, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to decrypt ${indexFilePath}.`,
        method, error)
    }
  }

  // Writes the index file encrypted for the current user. Optionally,
  // if someonesPubKey is defined, a second file is written, encrypted for the
  // owner of the someonesPubKey.
  //
  // TODO: similar to seqWriteLocalIndex. Compare and look to refactor.
  //
  async writeLocalIndex (dirPath, indexData, someonesPubKey = undefined) {
    const method = 'IndexedIO::writeLocalIndex'
    IndexedIO._checkFilePath(dirPath)

    const time = Date.now()
    indexData.time = time

    const indexFilePath = IndexedIO._getIndexPath(dirPath)

    let writeData
    try {
      writeData = await utils.encryptObj(this.publicKey, indexData, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`encrypting data to write index in ${dirPath}`,
        method, error)
    }

    const writePromises = []
    writePromises.push(this.ioInst.writeLocalFile(this.userId, indexFilePath, writeData))
    if (someonesPubKey) {
      writePromises.push(this._writeSharedIndex(dirPath, indexData, someonesPubKey))
    }

    // TODO: do a better job of handling specific failure messaging (Promise all
    //       does a first to fail strategy)
    try {
      await Promise.all(writePromises)
    } catch (error) {
      throw utils.fmtErrorStr(`writing index file(s).`, method, error)
    }
  }

  // Private -- don't call this outside of this class.
  //
  async _writeSharedIndex (dirPath, indexData, someonesPubKey) {
    const method = 'IndexedIO::_writeSharedIndex'
    const sharedIndexFilePath = IndexedIO._getSharedIndexPath(dirPath)

    this.logger(`DEBUG(${method}): encrypting shared index.`)
    let sharedIndexData
    try {
      sharedIndexData = await utils.encryptObj(someonesPubKey, indexData, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`encrypting data to write to shared index ${sharedIndexFilePath}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): encrypting shared index complete.`)

    this.logger(`DEBUG(${method}): writing shared index ${sharedIndexFilePath}.`)
    try {
      await this.ioInst.writeLocalFile(this.userId, sharedIndexFilePath, sharedIndexData)
    } catch (error) {
      throw utils.fmtErrorStr(`writing shared index ${sharedIndexFilePath}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): writing shared index ${sharedIndexFilePath} complete.`)
  }

  static _logIndex (logger, indexData) {
    logger('Index Data:')
    logger('---------------------------------------------------------')
    logger('  active:')
    for (const activeFileName in indexData.active) {
      logger(`    ${activeFileName}: ${indexData.active[activeFileName].time}`)
    }
    logger('')
  }

// Indexed/Managed File API
// //////////////////////////////////////////////////////////////////////////////

  // If someonesPubKey is not specified, this method writes the specified data to
  // filePath in this client user's storage using their encryption key.
  // It also updates the index file in filePath to list this file and the
  // time of the write operation.
  //
  // If someonesPubKey is defined, this method writes the specified data to
  // filePath in this client user's storage using someonesPubKey encryption key.
  // It also updates both the index file in filePath, readable by this client's
  // user, and the shared index file in filePath, encrypted to be readable by
  // the someone that owns someonesPubKey.
  //
  // TODO: this is now very similar to seqWriteLocalFile, consider merging them
  //       with a param to control delay.
  async writeLocalFile(filePath, data, someonesPubKey = undefined) {
    const method = 'IndexedIO::writeLocalFile'
    IndexedIO._checkFilePath(filePath)

    const path = IndexedIO._pathMinusTail(filePath)
    const fileName = this._pathTail(filePath)
    const time = Date.now()

    let indexData
    try {
      indexData = await this.readLocalIndex(path)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read index ${path}.`, method, error)
    }

    const sanoIndexData = IndexedIO._sanitizeIndexData(indexData)
    sanoIndexData.active[fileName] = { time }

    const encKey = (someonesPubKey) || this.publicKey
    let encData
    try {
      encData = await utils.encryptObj(encKey, data, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`encrypting data for file ${filePath}.`,
        method, error)
    }

    try {
      await this.writeLocalIndex(path, sanoIndexData, someonesPubKey)
    } catch (error) {
      throw utils.fmtErrorStr(`saving modified index ${path}.`, method, error)
    }

    try {
      await this.ioInst.writeLocalFile(this.userId, filePath, encData)
    } catch (error) {
      throw utils.fmtErrorStr(`writing file ${filePath}.`, method, error)
    }
  }

  // seqWriteLocalIndex:
  //   - all promises run sequentially using await.
  //   - in response to continuous writing to the same directory causing files
  //     to be dropped from the index on subsequent reads.
  //   - the problem appears to be more than just promises and concurrency, but
  //     actually related to settling time and availablility of the index being
  //     written.
  async seqWriteLocalIndex (dirPath, indexData, someonesPubKey = undefined) {
    const method = 'IndexedIO::seqWriteLocalIndex'
    IndexedIO._checkFilePath(dirPath)

    const time = Date.now()
    indexData.time = time

    const indexFilePath = IndexedIO._getIndexPath(dirPath)

    this.logger(`DEBUG(${method}): encrypting local index.`)
    let writeData
    try {
      writeData = await utils.encryptObj(this.publicKey, indexData, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to encrypt data for index ${indexFilePath}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): encrypting local index complete.`)

    this.logger(`DEBUG(${method}): writing local index ${indexFilePath}.`)
    try {
      await this.ioInst.writeLocalFile(this.userId, indexFilePath, writeData)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to write index ${indexFilePath}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): writing local index ${indexFilePath} complete.`)

    if (someonesPubKey) {
      this.logger(`DEBUG(${method}): writing shared index.`)
      try {
        await this._writeSharedIndex(dirPath, indexData, someonesPubKey)
      } catch (error) {
        throw utils.fmtErrorStr(`failed to write shared index to dir ${dirPath}.`,
          method, error)
      }
      this.logger(`DEBUG(${method}): writing shared index complete.`)
    }

    // IndexedIO._logIndex(this.logger, indexData);
  }

  // seqWriteLocalFile:
  //   - all promises run sequentially using await.
  //   - in response to continuous writing to the same directory causing files
  //     to be dropped from the index on subsequent reads.
  //   - the problem appears to be more than just promises and concurrency, but
  //     actually related to settling time and availablility of the index being
  //     written.
  //   - this may actually break or suffer the same problem when a shared index
  //     file is not written as we may loose some of the delay, here's a diagram
  //     showing the delay I'm talking about:
  //
  //     With shared index write:
  //
  //     R1         W1         W2         W3         Next Operation
  //     |----------|----------|----------|----------|
  //                           <-------delayA------->
  //
  //     Without shared index write (W2):
  //
  //     R1         W1         W3         Next Operation
  //     |----------|----------|----------|
  //                           <--delayB->
  //
  //     delayB is short enough that with enough concurrent writes, we will
  //     see a clobbering of the index written in W1 for the next R1 operation.
  //
  //     To combat this situation, we've added ENABLE_SEQ_WR_RD_DLY, which does this:
  //
  //     R1         W1         (W2)       W3                    Next Operation
  //     |----------|----------|----------|----------|----------|
  //                           <- delayA or delayB -> <- 50ms ->
  //
  // Cost analysis:
  //   Writing one file with a shared index does (in order):
  //     - read index (R1)
  //     - write index (W1)
  //     - write shared index (W2)
  //     - write new file (W3)
  //   Therefore one file write costs 1 read and 3 writes.
  //
  // After trying a variety of things, it looks like settling time/write
  // completion and availablility were causing our problems with dropping files
  // in the index. Making the three write operations sequential seems to fix
  // the issue--if only two of the writes are sequential, errors still happened
  // in limited testing with messages being dropped.
  //
  async seqWriteLocalFile (filePath, data, someonesPubKey = undefined) {
    const method = 'IndexedIO::seqWriteLocalFile'
    IndexedIO._checkFilePath(filePath)

    const path = IndexedIO._pathMinusTail(filePath)
    const fileName = this._pathTail(filePath)
    const time = Date.now()

    this.logger(`DEBUG(${method}): reading local index - ${path}`)
    let indexData
    try {
      indexData = await this.readLocalIndex(path)
    } catch (error) {
      throw utils.fmtErrorStr(`fetching index file trying to write ${filePath}`,
        method, error)
    }
    this.logger(`DEBUG(${method}): reading local index - ${path} complete.`)

    const sanoIndexData = IndexedIO._sanitizeIndexData(indexData)
    sanoIndexData.active[fileName] = { time }

    this.logger(`DEBUG(${method}): writing local index - ${path}`)
    try {
      await this.seqWriteLocalIndex(path, sanoIndexData, someonesPubKey)
    } catch (error) {
      throw utils.fmtErrorStr(`writing index file for ${filePath}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): writing local index - ${path} complete.`)

    this.logger(`DEBUG(${method}): encrypting outgoing message.`)
    let encData
    const encKey = (someonesPubKey) || this.publicKey
    try {
      encData = await utils.encryptObj(encKey, data, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`encrypting data to write to ${path}.`,
        method, error)
    }
    this.logger(`DEBUG(${method}): encrypting outgoing message complete.`)

    this.logger(`DEBUG(${method}): writing local file ${filePath}.`)
    try {
      await this.ioInst.writeLocalFile(this.userId, filePath, encData)
    } catch (error) {
      throw utils.fmtErrorStr(`writing file ${filePath}.`, method, error)
    }
    this.logger(`DEBUG(${method}): writing local file ${filePath} complete.`)

    this.logger(`DEBUG(${method}): delaying.`)
    if (ENABLE_SEQ_WR_RD_DLY) {
      await utils.resolveAfterMilliseconds(50)
    }
    this.logger(`DEBUG(${method}): delaying complete.`)
  }

  // TODO: deleteLocalDir, deleteLocalFiles, and deleteLocalFile all use the
  //       same basic mechanism. Refactor to one method.
  //
  // TODO: may need to rate limit (20/s or 200/s) for gaia (the promise all)
  async deleteLocalDir (dirPath, someonesPubKey = undefined) {
    const method = 'IndexedIO::deleteLocalDir'
    IndexedIO._checkFilePath(dirPath)

    const time = Date.now()

    let indexData
    try {
      indexData = await this.readLocalIndex(dirPath)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read index ${filePath}`, method, error)
    }

    const deleteFilePromises = []
    const sanoIndexData = IndexedIO._sanitizeIndexData(indexData)
    for (const fileName in sanoIndexData.active) {
      delete sanoIndexData.active[fileName]
      const filePath = `${dirPath}/${fileName}`
      deleteFilePromises.push(this.ioInst.deleteLocalFile(this.userId, filePath))
    }

    // Write the updated index first, then delete the files.
    try {
      await this.writeLocalIndex(dirPath, sanoIndexData, someonesPubKey)
    } catch (error) {
      throw utils.fmtErrorStr(`saving modified index ${dirPath}`, method, error)
    }

    // TODO: clean this up to catch the specific error, but allow other deletion
    //       promises to proceed (Promise.all is first fail).
    try {
      const results = await Promise.all(deleteFilePromises)
    } catch (error) {
      throw utils.fmtErrorStr(`deleting file(s).`, method, error)
    }
  }

  // TODO: may need to rate limit (20/s or 200/s) for gaia (the promise all)
  async deleteLocalFiles (dirPath, fileList, someonesPubKey) {
    const method = 'IndexedIO::deleteLocalFiles'
    IndexedIO._checkFilePath(dirPath)

    const time = Date.now()

    let indexData
    try {
      indexData = await this.readLocalIndex(dirPath)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read index ${dirPath}.`, method, error)
    }

    const deleteFilePromises = []
    const sanoIndexData = IndexedIO._sanitizeIndexData(indexData)
    for (const fileName in sanoIndexData.active) {
      if (fileList.includes(fileName)) {
        delete sanoIndexData.active[fileName]
        const filePath = `${dirPath}/${fileName}`
        deleteFilePromises.push(this.ioInst.deleteLocalFile(this.userId, filePath))
      }
    }

    // Write the updated index first, then delete the files.
    try {
      await this.writeLocalIndex(dirPath, sanoIndexData, someonesPubKey)
    } catch (error) {
      throw utils.fmtErrorStr(`saving modified index ${dirPath}.`, method, error)
    }

    // TODO: clean this up to catch the specific error, but allow other deletion
    //       promises to proceed (Promise.all is first fail).
    try {
      const results = await Promise.all(deleteFilePromises)
    } catch (error) {
      throw utils.fmtErrorStr(`deleting file(s).`, method, error)
    }
  }

  async deleteLocalFile (filePath, someonesPubKey = undefined) {
    const method = 'IndexedIO::deleteLocalDir'
    IndexedIO._checkFilePath(filePath)

    const path = IndexedIO._pathMinusTail(filePath)
    const fileName = this._pathTail(filePath)
    const time = Date.now()

    let indexData
    try {
      indexData = await this.readLocalIndex(path)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read index file ${path}.`,
        method, error)
    }

    const sanoIndexData = IndexedIO._sanitizeIndexData(indexData)
    if (fileName in sanoIndexData.active) {
      delete sanoIndexData.active[fileName]
    }

    try {
      await this.writeLocalIndex(path, sanoIndexData, someonesPubKey)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to write index file ${path}.`,
        method, error)
    }

    try {
      await this.ioInst.deleteLocalFile(this.userId, filePath)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to delete file ${filePath}.`,
        method, error)
    }
  }

  // TODO: handle encryption in these:
  //
  // Public Non-Indexed IO Methods (essentially pass-thru methods):
  //
  async readLocalFile (filePath) {
    const method = 'IndexedIO::readLocalFile'
    IndexedIO._checkFilePath(filePath)

    let data
    try {
      data = await this.ioInst.readLocalFile(this.userId, filePath)

      // TODO: should we add: '|| utils.isEmptyObj(data)' here?
      if (!data) {
        return undefined
      }
    } catch (error) {
      throw utils.fmtErrorStr(`unable to read ${filePath}.`, method, error)
    }

    try {
      return await utils.decryptObj(this.privateKey, data, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`unable to decrypt data from ${filePath}.`,
        method, error)
    }
  }

  async readRemoteFile (remoteUser, filePath) {
    const method = 'IndexedIO::readRemoteFile'
    IndexedIO._checkFilePath(filePath)

    let data
    try {
      data = await this.ioInst.readRemoteFile(remoteUser, filePath)
      if (!data || utils.isEmptyObj(data)) {
        return undefined
      }
    } catch (error) {
      throw utils.fmtErrorStr(`failed to read ${filePath} from ${remoteUser}.`,
        method, error)
    }

    try {
      return await utils.decryptObj(this.privateKey, data, this.useEncryption)
    } catch (error) {
      throw utils.fmtErrorStr(`failed to decrypt ${filePath} from ${remoteUser}.`,
        method, error)
    }
  }

  static _getIndexPath (aDir) {
    return `${aDir}/${INDEX_NAME}`
  }

  static _getSharedIndexPath (aDir) {
    return `${aDir}/${SHARED_INDEX_NAME}`
  }

  // The original design of baseIO was working in a single directory, but with
  // IndexedIO we're opening that up to deeper hierarchies. This method checks
  // for well formed file paths that do not exceed our limitations:
  //   - we don't support relative paths
  //   - we don't support dropping directories
  //   - we don't support absolute paths from root
  //
  static _checkFilePath (aFilePath) {
    const method = 'IndexedIO::_checkFilePath'
    if (aFilePath.startsWith('/')) {
      throw utils.fmtErrorStr(`Unsupported file path specified: ${filePath}. Paths cannot be specified from root.`,
        method)
    }

    if (aFilePath.endsWith('/')) {
      throw utils.fmtErrorStr(`Unsupported file path specified: ${filePath}. Trailing "/" not supported.`,
        method)
    }

    if (aFilePath.includes('..')) {
      throw utils.fmtErrorStr(`Unsupported file path specified: ${filePath}. ".." is not supported.`,
        method)
    }

    if (aFilePath.includes('./')) {
      throw utils.fmtErrorStr(`Unsupported file path specified: ${filePath}. "./" is not supported.`,
        method)
    }

    if (aFilePath.includes('~')) {
      throw utils.fmtErrorStr(`Unsupported file path specified: ${filePath}. "~" is not supported.`,
        method)
    }
  }

  _pathTail (aFilePath) {
    let retValue = IndexedIO.stringCopyForChrome(aFilePath)
    const idx = aFilePath.lastIndexOf('/')
    if (idx !== -1) {
      retValue = aFilePath.substr(idx + 1)
    }
    if (this.ioInst instanceof FirebaseIO) {
      retValue = utils.cleanPathForFirebase(retValue)
    }
    return retValue
  }

  // TODO:
  //   - is this needed?
  //   - is there a better way to shim this based on plaf?
  //
  // https://stackoverflow.com/questions/31712808/how-to-force-javascript-to-deep-copy-a-string
  static stringCopyForChrome (aString) {
    return (` ${aString}`).slice(1)
  }

  static _pathMinusTail (aFilePath) {
    const idx = aFilePath.lastIndexOf('/')
    if (idx !== -1) {
      return aFilePath.substr(0, idx)
    }
    return aFilePath
  }

  static _sanitizeIndexData (theIndexData) {
    const method = 'IndexedIO::_sanitizeIndexData'
    if ((theIndexData === undefined) || (theIndexData === null)) {
      theIndexData = {}
    }
    if (theIndexData.hasOwnProperty('deleted')) {
      delete theIndexData.deleted
    }
    if ((theIndexData.active === undefined) || (theIndexData.active === null)) {
      theIndexData.active = {}
    }
    if (theIndexData.hasOwnProperty('cipherText')) {
      throw utils.fmtErrorStr('index data is unexpectedly still encrypted!',
        method)
    }
    return theIndexData
  }
}

module.exports = { IndexedIO }
