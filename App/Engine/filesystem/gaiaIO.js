import { NativeModules } from 'react-native'
import API from './../../Services/Api'
import Config from 'react-native-config'
const BaseIO = require('./baseIO.js')

const utils = require('./../misc//utils.js')
import { HubCacheDataObj } from './../data/hubCacheDataObj'

import MeasureIOFrequency from './../measure/measureIOFrequency'

// TODO: this code needs a serious cleanup. Issues include:
//       - inconsistent / improper error handling between sequential and async calls
//       - error messaging
//       - return values
//       - look at async persisting the gaia hubCache

// TODO: need a way of switching putFile/getFile for putRawFile/getRawFile for
//       different build targets
const BlockstackNativeModule = NativeModules.BlockstackNativeModule
const {getRawFile, putRawFile} = BlockstackNativeModule

const api = API.create()
const gaia = API.Gaia()

const NAME_ENDPOINT = 'https://core.blockstack.org/v1/names'


module.exports = class GaiaIO extends BaseIO {
  constructor (logger,
               aLocalUserId,
               aPublicKey,
               deviceIO = undefined,
               logOutput = false) {
    super()

    utils.throwIfUndef('logger', logger)

    // Shoe-horned in here to support cache write for gaia lookups.
    // At this point, really need to consider a re-write of the IO layers to
    // change the API and support intrinsic knowledge of local user and local
    // user's keys (i.e. put the encryption into the IO instead of separating.)
    //
    // Alternately, we could factor this out and bind the ecnryption / user ID
    // to the deviceIO class or just explicitly call everything within an event
    // handler in the engine.
    this.userId = aLocalUserId
    this.publicKey = aPublicKey

    // Local device IO is used to store caches for improvements in speed on
    // loading of files etc. (i.e. prevent constantly hitting gaia lookup end
    // point for names we already have).
    this.deviceIO = deviceIO

    this.logger = logger
    this.logOutput = logOutput

    // Hub Cache stores hub urls for each user's application. The structure
    // looks like this:
    //  {
    //    pbj.id {
    //      'https://www.stealthy.im': <url>,
    //      'https://www.graphitedocs.im' : <url>,
    //      ...
    //    },
    //    ...
    //  }
    this.hubCache = new HubCacheDataObj()

    // Measure usage of this class for optimization purposes:
    //
    // this.ioMeasure = new MeasureIOFrequency()
    this.ioMeasure = undefined
  }

  // PrivateKey is used to decrypt the hub cache stored on the device. It's
  // encrypted b/c it could reveal contacts (future meta-data security).
  //
  async init(aPrivateKey) {
    const method = 'GaiaIO::init'

    if (this.deviceIO && aPrivateKey) {
      // Load the hub cache from local storage
      try {
        const cacheDataEnc =
          await this.deviceIO.readLocalFile(this.userId, 'gaiaHubCache.json')

        if (cacheDataEnc) {
          const cacheDataObj =
            await utils.decryptObj(aPrivateKey, cacheDataEnc, true)

          this.hubCache.initFromObj(cacheDataObj)
        }
      } catch (error) {
        console.log(`S-ERROR(${method}): failed to initialize GAIA hub cache.\n${error}`)
      }
    }
  }

  log (...args) {
    if (this.logOutput) {
      this.logger(...args)
    }
  }


  // Public:
  //

  // Attempts to read a file three times with an exponential delay between
  // attempts, plus jitter. Thank Jude Nelson for the idea based on the workings
  // of ethernet.
  async robustLocalRead (userId, filePath, maxAttempts = 3, initialDelayMs = 50) {
    const method = 'ChannelEngineV2::robustLocalRead'

    let attempt = 0
    let delayMs = initialDelayMs
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        return await this.readLocalFile(userId, filePath)
      } catch (error) {
        this.log(`INFO(${method}):\n  - Attempt number ${attempt} failed.\n  - Reason: ${error}.\n`)
        if (attempt < maxAttempts) {
          delayMs = delayMs * Math.pow(2, (attempt - 1)) + Math.floor(Math.random() * delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to read ${filePath} after ${maxAttempts} attempts.`
  }

  async robustRemoteRead (userId, filePath, maxAttempts = 3, initialDelayMs = 50) {
    const method = 'engine::robustRemoteRead'

    let attempt = 0
    let delayMs = initialDelayMs
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        return await this.readRemoteFile(userId, filePath)
      } catch (error) {
        this.log(`INFO(${method}):\n  - Attempt number ${attempt} failed.\n  - Reason: ${error}.\n`)
        if (attempt < maxAttempts) {
          delayMs = delayMs * Math.pow(2, (attempt - 1)) + Math.floor(Math.random() * delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to read ${userId}//${filePath} after ${maxAttempts} attempts.`
  }

  async robustLocalWrite (userId, filePath, fileContent, maxAttempts = 3, initialDelayMs = 50) {
    const method = 'ChannelEngineV2::robustLocalWrite'

    let attempt = 0
    let delayMs = initialDelayMs
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        return await this.writeLocalFile(userId, filePath, fileContent)
      } catch (error) {
        this.log(`INFO(${method}):\n  - Attempt number ${attempt} failed.\n  - Reason: ${error}.\n`)
        if (attempt < maxAttempts) {
          delayMs = delayMs * Math.pow(2, (attempt - 1)) + Math.floor(Math.random() * delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to write to ${filePath} after ${maxAttempts} attempts.`
  }

  writeLocalFile (localUser, filename, data) {
    utils.throwIfUndef('localUser', localUser)
    utils.throwIfUndef('filenname', filename)
    // data might be undefined or null.

    return this._write(localUser, filename, data)
  }

  readLocalFile (localUser, filename) {
    utils.throwIfUndef('localUser', localUser)
    utils.throwIfUndef('filenname', filename)

    return this._read(localUser, filename)
  }

  deleteLocalFile (localUser, filename) {
    utils.throwIfUndef('localUser', localUser)
    utils.throwIfUndef('filenname', filename)

    if (this.ioMeasure) {
      this.ioMeasure.recordDelete(localUser, filename)
    }

    return this._delete(filename)
  }

  readRemoteFile (username, filename) {
    utils.throwIfUndef('username', username)
    utils.throwIfUndef('filenname', filename)

    return this._read(username, filename)
  }

  _write (username, filePath, data) {
    this.log(`Writing data to ${username}'s GAIA in: '${filePath}'`)

    if (this.ioMeasure) {
      this.ioMeasure.recordWrite(username, filePath)
    }

    try {
      if (utils.is_iOS()) {
        // TODO: modify Blockstack -> RCT to use promises instead of completion
        return new Promise((resolve, reject) => {
          putRawFile(filePath, JSON.stringify(data), (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      } else if (utils.isAndroid()) {
        const stringifiedData = JSON.stringify(data)
        // The Blockstack putFile method for Android writes the interpreted string,
        // not the raw one to the file. For example:
        //   "{\"key\":\"value\"}"
        // gets written as:
        //   "{"key":"value"}"
        // which fails when you read it back. To fix that we make it so that the
        // backslashes are included in the write.
        //
        // const stringifiedDataWorkaround = stringifiedData.replace(/\"/g, '\\"')
        // return BlockstackNativeModule.putFile(filePath, stringifiedDataWorkaround, {encrypt: false})
        return BlockstackNativeModule.putFile(filePath, stringifiedData, {encrypt: false})
      } else {  // Web
        return putFile(filePath, JSON.stringify(data), {encrypt: false})
        .then(() => {
          this.log(`Success writing ${filePath} to ${username}'s GAIA.`)
          // this.logger('   Wrote:');
          // this.logger(JSON.stringify(data));
        })
        .catch((error) => {
          this.logger(`ERROR(gaiaIO::_write): writing ${filePath} to ${username}'s GAIA.\n${error}`)
          // this.logger('   Attempting to write:');
          // this.logger(JSON.stringify(data));
        })
      }
    } catch (err) {
      this.logger(`ERROR(gaiaIO::_write): unable to write ${username}'s file ${filename}. ${err}`)
      return undefined
    }
  }

  _readWeb (username, filePath) {
    const options = { username, zoneFileLookupURL: NAME_ENDPOINT, decrypt: false }

    return getFile(filePath, options)
    .then((data) => {
      return (data ? JSON.parse(data) : undefined)
    })
    .catch((error) => {
      throw `ERROR(gaiaIO::_readWeb): reading ${filePath} from ${username}'s GAIA.\n${error}`
    })
  }

  async _saveGaiaHubCache() {
    const method = 'GaiaIO::_saveGaiaHubCache'

    // Save cached gaia lookups (this is not critical data
    // so don't use the slow safe encrypt method)
    try {
      this.hubCache.setTimeBothSaved()
      const encHubCacheObj =
        await utils.encryptObj(this.publicKey, this.hubCache, true)
      await this.deviceIO.writeLocalFile(
        this.userId, 'gaiaHubCache.json', encHubCacheObj)
      console.log(`INFO(${method}): stored updated GAIA hub cache.`)
    } catch (error) {
      console.log(`S-ERROR(${method}): unable to store updated GAIA hub cache.\n${error}`)
    }
  }

  getGaiaHubUrl (aUserName, anAppUrl = 'https://www.stealthy.im', useCache = true) {
    return new Promise((resolve, reject) => {
      if (!aUserName) {
        reject('aUserName is not defined')
      } else if (useCache && this.hubCache.hasHubCacheEntry(aUserName, anAppUrl)) {
        resolve(this.hubCache.getHubCacheEntry(aUserName, anAppUrl))
      } else {
        api.getUserGaiaNS(aUserName, anAppUrl)
        .then((gaiaHubUrl) => {
          if (!gaiaHubUrl) {
            reject(`ERROR(gaiaIO.js::getGaiaHubUrl): unable to find gaia hub for user:${aUserName}, app:${anAppUrl}`)
          } else {
            this.hubCache.setHubCacheEntry(aUserName, anAppUrl, gaiaHubUrl)
            this._saveGaiaHubCache()
            resolve(gaiaHubUrl)
          }
        })
        .catch((error) => {
          reject(error)
        })
      }
    })
  }

  // _read_iOS Notes:
  // BlobNotFound results resolve as undefined.
  // Converts the callback style getRawFile call to promise style.
  //   - Did not write in async/await style b/c didn't want to mix error
  //   - paradigms (i.e. try/catch & .catch)
  //   - TODO: modify Blockstack -> RCT to use promises instead of completion.
  //
  _read_iOS (username, filePath) {
    return new Promise((resolve, reject) => {
      this.getGaiaHubUrl(username)
      .then((gaiaHubPath) => {
        if (gaiaHubPath) {
          getRawFile(filePath, gaiaHubPath, (error, content) => {
            if (!error) {
              if (!content || content.includes('<Error><Code>BlobNotFound')) {
                resolve(undefined)
              } else {
                try {
                  const obj = JSON.parse(content)
                  resolve(obj)
                } catch (error) {
                  console.log(`ERROR(GaiaIO::_read_iOS): Error parsing read content:\n${content}\n${error}\n`)
                  reject(error)
                }
              }
            } else {
              reject(error)
            }
          })
        } else {
          reject('ERROR(gaiaIO::_read_iOS): Unable to get gaia hub path.')
        }
      })
      .catch((hubError) => {
        reject(`ERROR(gaiaIO::_read_iOS): ${hubError}`)
      })
    })
  }

  // Multi-player read problems on Android when the bundle was on device
  // necessitated this method which does a simple http get on any user's GAIA.
  // Caching is used to improve performance by reducing GAIA lookups.
  // Very similar to _read_iOS above, but without call to native swift getRawFile
  _readAndroid (username, filePath) {
    return new Promise((resolve, reject) => {
      this.getGaiaHubUrl(username)
      .then((gaiaHubPath) => {
        if (gaiaHubPath) {
          const urlPath = `${gaiaHubPath}${filePath}`
          gaia.getFileMultiPlayer(urlPath)
          .then((data) => {
            if (!data || data.includes('<Error><Code>BlobNotFound')) {
              resolve(undefined)
            } else {
              resolve(data)
            }
          })
          .catch((error) => {
            reject(`ERROR(gaiaIO::_readAndroid): ${error}`)
          })
        } else {
          reject('ERROR(gaiaIO::_readAndroid): Unable to get gaia hub path.')
        }
      })
      .catch((hubError) => {
        reject(`ERROR(gaiaIO::_readAndroid): ${hubError}`)
      })
    })
  }

  _read (username, filePath) {
    this.log(`Reading from ${username}'s GAIA in '${filePath}'`)

    if (this.ioMeasure) {
      this.ioMeasure.recordRead(username, filePath)
    }

    if (utils.is_iOS()) {
      return this._read_iOS(username, filePath)
    } else if (utils.isAndroid()) {
      return this._readAndroid(username, filePath)
      .then((data) => {
        return data
      })

      // TODO: Keep this. At some point we may use it--we had to ditch it because
      //       of problems with Blockstack multi-player read when running on Android
      //       from the device bundle (instead of from the bundle running on the
      //       developer PC.)
      //       The reason to keep it is that it highlights some bugs/issues/differences
      //       in the API behaviors.
      //
      // const options = { username, zoneFileLookupURL: NAME_ENDPOINT, decrypt: false, app: 'https://www.stealthy.im' };
      // return BlockstackNativeModule.getFile(filePath, options)
      // .then((data) => {
      //   // TODO: do I need to handle empty blob files like iOS?
      //   // For some reason Android elected to return a map vs. iOS and Blockstack.js
      //   //
      //   let result = undefined
      //   if (data && data.hasOwnProperty('fileContents')) {
      //     result = JSON.parse(data.fileContents)
      //   } else if (data && data.hasOwnProperty('fileContentsEncoded')) {
      //     // Empty files / non-existing files seem to come in to this code path for Android.
      //     // Parsing an empty file will result in an error--if we detect an error, then just
      //     // return undefined.
      //     //
      //     // Base 64 encoded
      //     try {
      //       result = JSON.parse(data.fileContentsEncoded)
      //     } catch (error) {
      //       // Suppress
      //       result = undefined
      //     }
      //   }
      //   return result
      // })
    } else {
      return this._readWeb(username, filePath)
    }
  }

  _delete (filePath) {
    utils.throwIfUndef('filePath', filePath)

    this.log(`Deleting ${filePath}`)
    return this._write('', filePath, {})
  }
}
