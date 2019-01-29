// This class is an abstraction for reading and writing to local storage on
// the device that Stealthy is operating on.
//
// Presently it wraps React Native's AsyncStorage and provides a specific root
// key under which file paths are converted to keys for storing data.
//
// All local data is encrypted / decrypted when written / read with the user's
// key pair to prevent snooping etc. by other processes.
//
import {AsyncStorage} from 'react-native'

const asyncStorageRoot = '@DeviceStorage'
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

  async writeLocalFile(localUser, filename, data) {
    try {
      const keyPath = `${asyncStorageRoot}/${fileName}`
      await AsyncStorage.setItem(keyPath, data)
    } catch (error) {
      // TODO:
    } finally {

    }
  }

  async readLocalFile(localUser, filename) {
    let data = undefined
    try {
      const keyPath = `${asyncStorageRoot}/${fileName}`
      data = await AsyncStorage.getItem(keyPath)
    } catch (error) {
      // TODO:
    } finally {
      return data
    }
  }

  async deleteLocalFile(localUser, filename) {
    try {
      const keyPath = `${asyncStorageRoot}/${fileName}`
      await AsyncStorage.removeItem(keyPath)
    } catch (error) {
      // TODO:
    } finally {

    }
  }

  readRemoteFile() {
    // NO-OP (Unsupported - implies reading from a different device than the
    //        one we are operating on.)
  }
}

module.exports = { LocalIO }
