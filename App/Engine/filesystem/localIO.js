// This class is an abstraction for reading and writing to local storage on
// the device that Stealthy is operating on.
//
// Presently it wraps React Native's AsyncStorage and provides a specific root
// key under which file paths are converted to keys for storing data. The root
// key also takes into account different user's ids--i.e. if you log in as pbj.id
// and write contacts, you then log out and log in as schmooop.id, you would have
// problems decrypting and over-writing pbj.id's local storage. We key around that
// with unique paths for each local user.
//
// All local data should be encrypted / decrypted when written / read with the user's
// key pair to prevent snooping etc. by other processes.
//
import {AsyncStorage} from 'react-native'
const BaseIO = require('./baseIO.js')

const asyncStorageRoot = '@StealthyDeviceStorage'
// TODO: need to separate this by platform (i.e. Desktop won't be using react
//       native AsyncStorage).
//
// TODO: un-stupidify this interface and make localUser an argument to the constructor
//       (same for gaiaIO)
//
// TODO: compression?
//
class LocalIO extends BaseIO {
  constructor() {
    super()
  }

  async writeLocalFile(localUser, fileName, data) {
    try {
      const keyPath = LocalIO.getKeyPath(localUser, fileName)
      await AsyncStorage.setItem(keyPath, data)
    } catch (error) {
      // TODO:
    } finally {
    }
  }

  async readLocalFile(localUser, fileName) {
    let data = undefined
    try {
      const keyPath = LocalIO.getKeyPath(localUser, fileName)
      // Returns 'null' on iOS (possibly Android too) if no file.
      data = await AsyncStorage.getItem(keyPath)
    } catch (error) {
      // TODO:
    } finally {
      return data
    }
  }

  async deleteLocalFile(localUser, fileName) {
    try {
      const keyPath = LocalIO.getKeyPath(localUser, fileName)
      await AsyncStorage.removeItem(keyPath)
    } catch (error) {
      // TODO:
    } finally {

    }
  }

  readRemoteFile(username, filename) {
    // NO-OP (Unsupported - implies reading from a different device than the
    //        one we are operating on.)
  }

  static getKeyPath(aLocalUserId, aFileName) {
    return `${asyncStorageRoot}:${aLocalUserId}:${aFileName}`
  }
}

module.exports = { LocalIO }
