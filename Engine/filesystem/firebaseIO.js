const BaseIO = require('./baseIO.js');
const utils = require('./../misc/utils.js')
const { firebaseInstance } = require('./../firebaseWrapper.js')

const ROOT = '/global/gaia';
const APP_NAME = 'stealthy.im';

module.exports = class FirebaseIO extends BaseIO {
  constructor(logger, pathURL, logOutput = false) {
    super();
    this.logger = logger;
    this.logOutput = logOutput;
    this.pathURL = pathURL;
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  // Public:
  //
  
  // Attempts to read a file three times with an exponential delay between
  // attempts, plus jitter. Thank Jude Nelson for the idea based on the workings
  // of ethernet.
  async robustLocalRead(userId, filePath, maxAttempts=3, initialDelayMs=50) {
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
          delayMs = delayMs * Math.pow(2, (attempt-1)) + Math.floor(Math.random()*delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to read ${filePath} after ${maxAttempts} attempts.`
  }

  async robustRemoteRead(userId, filePath, maxAttempts=3, initialDelayMs=50) {
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
          delayMs = delayMs * Math.pow(2, (attempt-1)) + Math.floor(Math.random()*delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to read ${userId}//${filePath} after ${maxAttempts} attempts.`
  }

  async robustLocalWrite(userId, filePath, fileContent, maxAttempts=3, initialDelayMs=50) {
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
          delayMs = delayMs * Math.pow(2, (attempt-1)) + Math.floor(Math.random()*delayMs)
          this.log(`  - Waiting ${delayMs} milliseconds before next attempt.`)
          await utils.resolveAfterMilliseconds(delayMs)
        }
      }
    }

    // Throw b/c we never successfully read a value
    throw `ERROR(${method}): failed to write to ${filePath} after ${maxAttempts} attempts.`
  }

  writeLocalFile(localUser, fileName, data) {
    // Clone the data we're writing b/c Firebase seems to make it sealed/immutable
    // which breaks the engine on iOS/ReactNative. The coniditional assignment is
    // for those special moments where for some reason we write an undefined value.
    const dcData = (data) ? utils.deepCopyObj(data) : data;

    const filePath = `${this._getLocalApplicationPath(localUser)}/${fileName}`;
    return this._write(filePath, dcData);
  }

  readLocalFile(localUser, fileName) {
    const filePath = `${this._getLocalApplicationPath(localUser)}/${fileName}`;
    return this._read(filePath);
  }

  deleteLocalFile(localUser, fileName) {
    const filePath = `${this._getLocalApplicationPath(localUser)}/${fileName}`;
    return this._delete(filePath);
  }

  readRemoteFile(remoteUser, fileName) {
    const filePath = `${this._getRemoteApplicationPath(remoteUser)}/${fileName}`;
    return this._read(filePath);
  }

  // Private:
  //
  _getLocalApplicationPath(localUser, appName = APP_NAME) {
    return `${ROOT}/${localUser}/${this.pathURL}/${APP_NAME}`;
  }

  _getRemoteApplicationPath(remoteUser, appName = APP_NAME) {
    return `${ROOT}/${remoteUser}/${this.pathURL}/${APP_NAME}`;
  }

  _write(filePath, data) {
    const cleanPath = utils.cleanPathForFirebase(filePath);
    this.log(`Writing data to: ${cleanPath}`);
    try {
      // TODO: set returns a promise--need to make this await and _write async
      //       or use a .catch
      return firebaseInstance.getFirebaseRef(cleanPath).set(data)
    } catch (err) {
      let errMsg = `ERROR: firebaseIO::_write ${err}`;
      if (process.env.NODE_ENV === 'production') {
        this.logger(errMsg);
      } else {
        throw errMsg;
      }
    }
  }

  _read(filePath) {
    const cleanPath = utils.cleanPathForFirebase(filePath);
    const targetRef = firebaseInstance.getFirebaseRef(cleanPath);

    return targetRef.once('value')
    .then((snapshot) => {
      this.log(`Read data from: ${cleanPath}`);
      return snapshot.val();
    })
    .catch((error) => {
      this.logger(`Read failed from: ${cleanPath}`);
      return undefined;
    });
  }

  _delete(filePath) {
    const cleanPath = utils.cleanPathForFirebase(filePath);
    this.log(`Deleting ${cleanPath}`);
    return firebaseInstance.getFirebaseRef(cleanPath).remove();
  }
};
