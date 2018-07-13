const BaseIO = require('./baseIO.js');
const utils = require('./../misc//utils.js');

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

    this.hubCache = {};
    this.logger = logger;
    this.logOutput = logOutput;
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  clearHubCache() {
    this.hubCache = {}
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
      this.logger(`ERROR(gaiaIO::_readWeb): reading ${filePath} from ${username}'s GAIA.\n${error}`);
      return;
    });
  }

  _getGaiaHubAddrWorkaround(aUserName, useCache = true) {
    return new Promise((resolve, reject) => {
      if (!aUserName) {
        reject(aUserName)
      } else if (useCache && (aUserName in this.hubCache)) {
        resolve(this.hubCache[aUserName])
      } else {
        api.getUserGaiaNS(aUserName)
        .then((gaiaHub) => {
          this.hubCache[aUserName] = gaiaHub
          resolve(gaiaHub)
        })
        .catch((error) => {
          console.log(`ERROR(gaiaIO.js::_getGaiaHubAddrWorkaround): ${error}`)
          reject(undefined)
        })
      }
    })
  }

  async _read_iOS(username, filePath) {
    // TODO: modify Blockstack -> RCT to use promises instead of completion
    let gaiaHubPath = undefined
    try {
      gaiaHubPath = await this._getGaiaHubAddrWorkaround(username)
      if (!gaiaHubPath) {
        throw 'gaiaHubPath undefined'
      }
    } catch (err) {
      console.log(`ERROR(gaiaIO.js::_read_iOS): ${err}`)
      return
    }

    return new Promise((resolve, reject) => {
      getRawFile(filePath, gaiaHubPath, (error, content) => {
        if (error) {
          reject(error);
        } else {
          const result = (!content || content.includes('<Error><Code>BlobNotFound')) ?
            undefined : JSON.parse(content)

          resolve(result)
        }
      })
    })
  }

  _read(username, filePath) {
    this.log(`Reading from ${username}'s GAIA in '${filePath}'`);
    try {
      return (utils.is_iOS()) ?
        this._read_iOS(username, filePath) : this._readWeb(username, filePath)
    } catch (err) {
      this.logger(`ERROR(gaiaIO::_read): unable to read ${username}'s file ${filePath}.\n${err}`);
      return undefined;
    }
  }

  _delete(filePath) {
    utils.throwIfUndef('filePath', filePath);

    this.log(`Deleting ${filePath}`);
    return this._write('', filePath, {});
  }
};
