const BaseIO = require('./baseIO.js');
const utils = require('./../misc//utils.js');

// TODO: this code needs a serious cleanup. Issues include:
//       - inconsistent / improper error handling between sequential and async calls
//       - error messaging
//       - return values
//       - look at async persisting the gaia hubCache

// TODO: need a way of switching putFile/getFile for putRawFile/getRawFile for
//       different build targets
import { NativeModules } from 'react-native';
const BlockstackNativeModule = NativeModules.BlockstackNativeModule;
const {getRawFile, putRawFile} = BlockstackNativeModule;

import API from './../../Services/Api'
const api = API.create()

const NAME_ENDPOINT = 'https://core.blockstack.org/v1/names';
const ENABLE_IOS_LOOKUP_WORKAROUND = true;

module.exports = class GaiaIO extends BaseIO {
  constructor(logger,
              logOutput = false) {
    super();

    utils.throwIfUndef('logger', logger);

    this.logger = logger;
    this.logOutput = logOutput;

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
    this.hubCache = {};
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  clearHubCache() {
    this.hubCache = {}
  }

  setHubCacheEntry(aUserName, anAppUrl, hubUrl) {
    if (!this.hubCache.hasOwnProperty(aUserName)) {
      this.hubCache[aUserName] = {}
    }
    this.hubCache[aUserName][anAppUrl] = hubUrl
  }

  getHubCacheEntry(aUserName, anAppUrl) {
    if (this.hubCache.hasOwnProperty(aUserName)) {
      const userHubCache = this.hubCache[aUserName]
      if (userHubCache && userHubCache.hasOwnProperty(anAppUrl)) {
        return userHubCache[anAppUrl]
      }
    }
    return undefined
  }

  hasHubCacheEntry(aUserName, anAppUrl) {
    if (this.getHubCacheEntry(aUserName, anAppUrl)) {
      return true
    }
    return false
  }

  // Public:
  //
  writeLocalFile(localUser, filename, data) {
    utils.throwIfUndef('localUser', localUser);
    utils.throwIfUndef('filenname', filename);
    // data might be undefined or null.

    return this._write(localUser, filename, data);
  }

  readLocalFile(localUser, filename) {
    utils.throwIfUndef('localUser', localUser);
    utils.throwIfUndef('filenname', filename);

    return this._read(localUser, filename);
  }

  deleteLocalFile(localUser, filename) {
    utils.throwIfUndef('localUser', localUser);
    utils.throwIfUndef('filenname', filename);

    return this._delete(filename);
  }

  readRemoteFile(username, filename) {
    utils.throwIfUndef('username', username);
    utils.throwIfUndef('filenname', filename);

    return this._read(username, filename);
  }

  _write(username, filePath, data) {
    this.log(`Writing data to ${username}'s GAIA in: '${filePath}'`);
    try {
      if (utils.is_iOS()) {
        // TODO: modify Blockstack -> RCT to use promises instead of completion
        return new Promise((resolve, reject) => {

          putRawFile(filePath, JSON.stringify(data), (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          })
        })
      } else {
        return putFile(filePath, JSON.stringify(data), {encrypt: false})
        .then(() => {
          this.log(`Success writing ${filePath} to ${username}'s GAIA.`);
          // this.logger('   Wrote:');
          // this.logger(JSON.stringify(data));
          return;
        })
        .catch((error) => {
          this.logger(`ERROR(gaiaIO::_write): writing ${filePath} to ${username}'s GAIA.\n${error}`);
          // this.logger('   Attempting to write:');
          // this.logger(JSON.stringify(data));
          return;
        });
      }
    } catch (err) {
      this.logger(`ERROR(gaiaIO::_write): unable to write ${username}'s file ${filename}. ${err}`);
      return undefined;
    }
  }

  _readWeb(username, filePath) {
    const options = { username, zoneFileLookupURL: NAME_ENDPOINT, decrypt: false };

    return getFile(filePath, options)
    .then((data) => {
      return (data ? JSON.parse(data) : undefined)
    })
    .catch((error) => {
      throw `ERROR(gaiaIO::_readWeb): reading ${filePath} from ${username}'s GAIA.\n${error}`
    });
  }

  _getGaiaHubUrl(aUserName, anAppUrl='https://www.stealthy.im' , useCache=true) {
    return new Promise((resolve, reject) => {
      if (!aUserName) {
        reject('aUserName is not defined')
      } else if (useCache && this.hasHubCacheEntry(aUserName, anAppUrl)) {
        resolve(this.getHubCacheEntry(aUserName, anAppUrl))
      } else {
        api.getUserGaiaNS(aUserName, anAppUrl)
        .then((gaiaHubUrl) => {
          if (!gaiaHubUrl) {
            reject(`ERROR(gaiaIO.js::_getGaiaHubUrl): unable to fetch gaia hub for ${aUserName}`)
          } else {
            this.setHubCacheEntry(aUserName, anAppUrl, gaiaHubUrl)
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
  _read_iOS(username, filePath) {
    return new Promise((resolve, reject) => {
      this._getGaiaHubUrl(username)
      .then((gaiaHubPath) => {
        if (gaiaHubPath) {
          getRawFile(filePath, gaiaHubPath, (error, content) => {
            if (!error) {
              if (!content || content.includes('<Error><Code>BlobNotFound')) {
                resolve(undefined)
              } else {
                resolve(JSON.parse(content))
              }
            } else {
              reject(error)
            }
          })
        } else {
          reject('Unable to get gaia hub path.')
        }
      })
      .catch((hubError) => {
        reject(hubError)
      })
    })
  }

  _read(username, filePath) {
    this.log(`Reading from ${username}'s GAIA in '${filePath}'`);
    if (utils.is_iOS()) {
      return this._read_iOS(username, filePath)
    } else {
      return this._readWeb(username, filePath)
    }
  }

  _delete(filePath) {
    utils.throwIfUndef('filePath', filePath);

    this.log(`Deleting ${filePath}`);
    return this._write('', filePath, {});
  }

  readPartnerAppFile(aUserName, aFilePath, anAppUrl) {
    const method = 'gaiaIO.js::readPartnerAppFile'
    console.log(`DEBUG(${method}): Reading ${aFilePath} from ${aUserName}'s ${anAppUrl} GAIA.`)

    if (!aUserName || !aFilePath || !anAppUrl) {
      throw `ERROR(${method}): aFileName or aHubUrl not specified.`
    }

    if (!utils.is_iOS()) {
      throw `ERROR(${method}): Non-iOS deployments not yet supported.`
    }

    return new Promise((resolve, reject) => {
      this._getGaiaHubUrl(aUserName, anAppUrl)
      .then((gaiaHubUrl) => {
        if (gaiaHubUrl) {
          getRawFile(aFilePath, gaiaHubUrl, (error, content) => {
            if (!error) {
              if (!content || content.includes('<Error><Code>BlobNotFound')) {
                resolve(undefined)
              } else {
                resolve(result)
              }
            } else {
              reject(error);
            }
          })
        } else {
          reject('Unable to get gaia hub path.')
        }
      })
      .catch((error) => {
        reject(error)
      })
    })
  }

  // // TODO: remove this when readPartnerAppFile above is in service
  // //
  // readFileFromHub(aFileName, aHubUrl) {
  //   console.log(`DEBUG(gaiaIO.js::readFileFromHub): Reading ${aHubUrl}/${aFileName}.`)
  //
  //   if (!aFileName || !aHubUrl) {
  //     throw `ERROR(gaiaIO.js::readFileFromHub): aFileName or aHubUrl not specified.`
  //   }
  //
  //   if (!utils.is_iOS()) {
  //     throw `ERROR(gaiaIO.js::readFileFromHub): Non-iOS deployments not yet supported.`
  //   }
  //
  //   return new Promise((resolve, reject) => {
  //     getRawFile(aFileName, aHubUrl, (error, content) => {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         const result = (!content || content.includes('<Error><Code>BlobNotFound')) ?
  //           undefined : content
  //
  //         resolve(result)
  //       }
  //     })
  //   })
  // }
};
