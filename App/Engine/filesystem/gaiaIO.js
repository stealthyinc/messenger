// TODO: get these through Blockstack iOS API
// const {
//   getFile,
//   putFile,
// } = require('blockstack');
function getFile(arg1, arg2) {
  throw 'TODO: in gaiaIO.js, need to get IO methods from iOS Blockstack'
}

function putFile(arg1, arg2, arg3) {
  throw 'TODO: in gaiaIO.js, need to get IO methods from iOS Blockstack'
}


const utils = require('./../misc//utils.js');
const BaseIO = require('./baseIO.js');

const NAME_ENDPOINT = 'https://core.blockstack.org/v1/names';

module.exports = class GaiaIO extends BaseIO {
  constructor(logger,
              logOutput = false) {
    super();

    utils.throwIfUndef('logger', logger);

    this.logger = logger;
    this.logOutput = logOutput;
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
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
    } catch (err) {
      this.logger(`ERROR(gaiaIO::_write): unable to write ${username}'s file ${filename}. ${err}`);
      return undefined;
    }
  }

  _read(username, filePath) {
    this.log(`Reading from ${username}'s GAIA in '${filePath}'`);
    const options = { username, zoneFileLookupURL: NAME_ENDPOINT, decrypt: false };

    try {
      return getFile(filePath, options)
      .then((data) => {
        if (data) {
          return JSON.parse(data);
        }
        this.log(`gaiaIO: no data reading ${filePath} from ${username}'s GAIA.'`);
        return undefined;
      })
      .catch((error) => {
        this.logger(`ERROR(gaiaIO::_read): reading ${filePath} from ${username}'s GAIA.\n${error}`);
        return;
      });
    } catch (err) {
      this.logger(`ERROR(gaiaIO::_read): unable to read ${username}'s file ${filename}.\n${err}`);
      return undefined;
    }
  }

  _delete(filePath) {
    utils.throwIfUndef('filePath', filePath);

    this.log(`Deleting ${filePath}`);
    return this._write('', filePath, {});
  }
};
