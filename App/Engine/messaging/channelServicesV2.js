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
  static MAX_MESSAGES_PER_OUTER_FOLDER = ChannelServicesV2.MAX_MESSAGES_PER_FILE *
    ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER *
    ChannelServicesV2.MAX_FOLDERS_PER_OUTER_FOLDER
  static MAX_SUPPORTED_OUTER_FOLDER_NUM = Math.floor(Number.MAX_SAFE_INTEGER /
    (ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER *
     ChannelServicesV2.MAX_FOLDERS_PER_OUTER_FOLDER))
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
  //
  // Special case:  If aMsgAddress is 0/0/0, then return the last n messages as
  //                specified in firstFetchLimit after returning the first message
  //                (which is typically a disclaimer)
  getMsgFilePaths(aMsgAddress, maxPaths=4, firstFetchLimit=20) {
    let msgFilePaths = []
    if (aMsgAddress) {
      let pathCount = 0

      if (ChannelServicesV2.isFirstMsgAddress(aMsgAddress)) {
        // The channel was just added so fetch the maximum number of first time
        // messages to kick things off.
        maxPaths = firstFetchLimit

        // How many messages are outstanding to d/l or fetch:
        const numMsgs = ChannelServicesV2.getNumberOfMessages(this.lastMsgAddress)
        if (numMsgs > firstFetchLimit) {
          msgFilePaths.push(ChannelServicesV2.getMsgFilePath(aMsgAddress))
          pathCount++

          // Now increment to the last message minus the first fetch limit
          let startMsgNum = numMsgs - firstFetchLimit

          // Special case for not duplicating the 0th message:
          if (startMsgNum === 1) {
            startMsgNum++
          }

          // Get the address and then set the members of aMsgAddress below (because
          // we are using pass by ref style modification of the object passed in):
          const startMsgAddr = ChannelServicesV2.getMsgAddressFromMsgNum(startMsgNum)
          aMsgAddress.outerFolderNumber = startMsgAddr.outerFolderNumber
          aMsgAddress.innerFolderNumber = startMsgAddr.innerFolderNumber
          aMsgAddress.fileNumber = startMsgAddr.fileNumber
        }
      }

      // Note msgAddressLessThan returns undefined if objects are problematic (which
      // resolves to falsy and prevents our loop from running)

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

  // TODO: these methods below will fail for values larger than 2^53-1 (js max
  //       safe integer). We should handle that at some point.

  // Returns the number of messages for a given message address object.
  // For example, consider msg address 3/4/10 (short format):
  // numMsgs = (10+1)*1 +
  //           4 * 1000 +
  //           3 * 1000 * 1000
  //         = 11 + 4,000 + 3,000,000
  //         = 3,004,011
  //
  static getNumberOfMessages(aMsgAddress) {
    let numMsgs = 0
    if (aMsgAddress) {
      if (aMsgAddress.outerFolderNumber >=
          ChannelServicesV2.MAX_SUPPORTED_OUTER_FOLDER_NUM) {
        throw(`ERROR(ChannelServicesV2::getNumberOfMessages): aMsgAddress will calculate to exceed a number representable in js.`)
      }

      numMsgs = ((aMsgAddress.fileNumber + 1) *
                 ChannelServicesV2.MAX_MESSAGES_PER_FILE) +
                (aMsgAddress.innerFolderNumber *
                 ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER) +
                (aMsgAddress.outerFolderNumber *
                 ChannelServicesV2.MAX_FOLDERS_PER_OUTER_FOLDER *
                 ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER)
    }
    return numMsgs
  }

  // Returns the address for a given message number--i.e.
  //  * aMsgNum=1 would return the long form of 0/0/0
  //  * aMsgNum=327 would return the long form of 0/0/326
  //  * aMsgNum=3004011 would return the long form of 3/4/10
  //  * aMsgNum < 1 returns the long form of 0/0/0
  static getMsgAddressFromMsgNum(aMsgNum) {
    if (aMsgNum >= Number.MAX_SAFE_INTEGER) {
      throw(`ERROR(ChannelServicesV2::getMsgAddressFromMsgNum): aMsgNum exceeds or is the max number representable in js.`)
    } else if (aMsgNum <= 0) {
      throw(`ERROR(ChannelServicesV2::getMsgAddressFromMsgNum): aMsgNum(${aMsgNum}) must be > 0.`)
    }

    const outerFolderNumber = Math.floor(aMsgNum / ChannelServicesV2.MAX_MESSAGES_PER_OUTER_FOLDER)
    let remainingMsgs = Math.floor(aMsgNum % ChannelServicesV2.MAX_MESSAGES_PER_OUTER_FOLDER)
    const innerFolderNumber = Math.floor(remainingMsgs / ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER)
    remainingMsgs = Math.floor(remainingMsgs % ChannelServicesV2.MAX_FILES_PER_INNER_FOLDER)
    let fileNumber = remainingMsgs - 1
    if (fileNumber < 0) {
      fileNumber = 0
    }

    return {
      outerFolderNumber,
      innerFolderNumber,
      fileNumber
    }
  }

  static isFirstMsgAddress(aMsgAddress) {
    return aMsgAddress &&
           aMsgAddress.fileNumber === 0 &&
           aMsgAddress.innerFolderNumber === 0 &&
           aMsgAddress.outerFolderNumber === 0
  }
}

module.exports = { ChannelServicesV2 }
