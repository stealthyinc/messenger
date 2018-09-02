// #PLATFORM_MGMT
// Platform dependent (commented out parts are for other platforms)
// -----------------------------------------------------------------------------
// Web/React Server:
// ...
//
// Web/React Client (TODO: one day.)
// ...
//
// Mobile/React Native:
// ...
//
//
// Common:
//
const utils = require('./../misc/utils.js');


// Tools for managing a channel.
// The filestructure looks like this:
//
// <gaia bucket>/channel/
// 	                    status.json
// 	                    0/
// 	                      0/
// 	                        0.cm
// 	                        1.cm
// 	                        …
// 	                        999.cm
// 	                      1/
// 	                        …
// 	                      999/
// 	                          …
// 	                          0/
// 	                            …
//
// A message file can be described with an address like so:
//
//   0:1:791   --> file <gaia bucket>/channel/0/1/791.cm
//
class ChannelServicesV2 {
  static MAX_MESSAGES_PER_FILE = 1
  static MAX_FILES_PER_INNER_FOLDER = 1000
  static MAX_FOLDERS_PER_OUTER_FOLDER = 1000
  //
  static CHANNEL_DIR = 'channel'
  static STATUS_FILENAME = 'status.json'

  constructor() {
    // Uniquely identifyies each message while also describing where it is
    // stored in our sharded append only log:
    this.lastMsgAddress = {
      fileNumber: 0,
      innerFolderNumber: 0,
      outerFolderNumber: 0
    }
  }

  // The last message address is typically stored stringified in status.json
  //
  setLastMsgAddress(aMsgAddress) {
    if (!aMsgAddress) {
      throw `ERROR(ChannelServicesV2::setLastMsgAddress): aMsgAddress is not defined.`
    }
    this.lastMsgAddress = utils.deepCopyObj(aMsgAddress)
  }
  //
  getLastMsgAddress() {
    return utils.deepCopyObj(this.lastMsgAddress)
  }

  getCompactLastMsgAddress() {
    const addr = this.lastMsgAddress
    return `${addr.outerFolderNumber}/${addr.innerFolderNumber}/${addr.fileNumber}`
  }

  getLastMessageFilePath() {
    return ChannelServicesV2.getMsgFilePath(this.lastMsgAddress)
  }

  incrementLastMsgAddress() {
    this.lastMsgAddress = ChannelServicesV2.getIncrementedMsgAddress(this.lastMsgAddress)
  }

  // Returns an array of message paths (in order) from the provided aMsgAddress,
  // up to the current lastMsgAddress.  By default, the first four paths from aMsgAddress
  // are provided--but this can be changed by modifiying the maxPaths argument.
  // An empty array is returned if aMsgAddress is the same as the lastMsgAddress.
  //
  // NOTE / WARNING: Also increments aMsgAddress object passed in.
  //
  // // TODO: better check on types (numbers etc.)
  getMsgFilePaths(aMsgAddress, maxPaths=4) {
    let msgFilePaths = []
    if (aMsgAddress) {
      // Note msgAddressLessThan returns undefined if objects are problematic (which
      // resolves to falsy and prevents our loop from running)
      let pathCount = 0
      while ((pathCount < maxPaths) &&
             ChannelServicesV2.msgAddressLessThanOrEqual(aMsgAddress, this.lastMsgAddress)) {
        msgFilePaths.push(ChannelServicesV2.getMsgFilePath(aMsgAddress))
        pathCount++
        ChannelServicesV2.incrementMsgAddress(aMsgAddress)
      }
    }

    return msgFilePaths
  }

  static getMsgFileName(aFileNumber) {
    if (Number.isInteger(aFileNumber) &&
        (aFileNumber >= 0) &&
        (aFileNumber < ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER)) {
      return `${aFileNumber}.cm`
    }

    throw `ERROR(ChannelServicesV2::getMsgFileName): aFileNumber should be an \
           integer >= 0 and < ${ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER}.`
  }

  static getStatusFilePath() {
    return `${ChannelServicesV2.CHANNEL_DIR}/${ChannelServicesV2.STATUS_FILENAME}`
  }

  static getMsgFilePath(aMessageAddress) {
    if (aMessageAddress) {
      const fileName = ChannelServicesV2.getMsgFileName(aMessageAddress.fileNumber)
      return `${ChannelServicesV2.CHANNEL_DIR}/${aMessageAddress.outerFolderNumber}/${aMessageAddress.innerFolderNumber}/${fileName}`
    }
    return undefined
  }

  // For atomic updates and new object creation.
  static getIncrementedMsgAddress(aMessageAddress) {
    const addr = utils.deepCopyObj(aMessageAddress)
    ChannelServicesV2.incrementMsgAddress(addr)

    return addr
  }

  // For in place mdoification of an existing object
  static incrementMsgAddress(aMessageAddress) {
    aMessageAddress.fileNumber++

    if (aMessageAddress.fileNumber === ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER) {
      aMessageAddress.fileNumber = 0
      aMessageAddress.innerFolderNumber++
      if (aMessageAddress.innerFolderNumber === ChannelServicesV2.MAX_FOLDERS_PER_OUTER_FOLDER) {
        aMessageAddress.innerFolderNumber = 0
        aMessageAddress.outerFolderNumber++
      }
    }
  }

  // Returns undefined if invalid addresses passed in.
  static msgAddressLessThanOrEqual(msgAddress1, msgAddress2) {
    // TODO: make this less crappy. In a hurry. Needs things like parseInt and
    //       refactoring.
    // if ((msgAddress1 &&
    //      msgAddress1.outerFolderNumber &&
    //      msgAddress1.innerFolderNumber &&
    //      msgAddress1.fileNumber) &&
    //     (msgAddress2 &&
    //      msgAddress2.outerFolderNumber &&
    //      msgAddress2.innerFolderNumber &&
    //      msgAddress2.fileNumber)) {
    try {
      if (msgAddress1 && msgAddress2) {
        if (msgAddress1.outerFolderNumber > msgAddress2.outerFolderNumber) {
          return false
        } else if (msgAddress1.outerFolderNumber < msgAddress2.outerFolderNumber) {
          return true
        } else { // equal outerFolderNumbers
          if (msgAddress1.innerFolderNumber > msgAddress2.innerFolderNumber) {
            return false
          } else if (msgAddress1.innerFolderNumber < msgAddress2.innerFolderNumber) {
            return true
          } else  {// equal innerFolderNumbers
            return (msgAddress1.fileNumber <= msgAddress2.fileNumber)
          }
        }
      }
    } catch (error) {
    // Suppress
    }
    return undefined
  }

  static msgAddressEqual(msgAddress1, msgAddress2) {
    if (msgAddress1 && msgAddress2) {
      try {
        return ((msgAddress1.fileNumber === msgAddress2.fileNumber) &&
                (msgAddress1.innerFolderNumber === msgAddress2.innerFolderNumber) &&
                (msgAddress1.outerFolderNumber === msgAddress2.outerFolderNumber))
      } catch (error) {
        // Suppress
      }
    }
    return false
  }

  static getMsgAddressFromCompact(aCompactMsgAddress) {
    try {
      const patt = /^([0-9]+)\/([0-9]+)\/([0-9]+)/g
      const res = patt.exec(aCompactMsgAddress)
      return {
        outerFolderNumber: parseInt(res[1]),
        innerFolderNumber: parseInt(res[2]),
        fileNumber: parseInt(res[3])
      }
    } catch (error) {
      return undefined
    }
  }
}

module.exports = { ChannelServicesV2 }
