const BaseIO = require('./baseIO.js');

const ROOT = '/global/gaia';
const APP_NAME = 'stealthy.im';

module.exports = class FirebaseIO extends BaseIO {
  constructor(logger, firebaseInst, pathURL, logOutput = false) {
    super();
    this.logger = logger;
    this.logOutput = logOutput;
    this.firebaseInst = firebaseInst;
    this.pathURL = pathURL;
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  // Public:
  //
  writeLocalFile(localUser, fileName, data) {
    const filePath = `${this._getLocalApplicationPath(localUser)}/${fileName}`;
    return this._write(filePath, data);
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
  _cleanPathForFirebase(path) {
    return path.replace(/\./g, '_');
  }

  _getLocalApplicationPath(localUser, appName = APP_NAME) {
    return `${ROOT}/${localUser}/${this.pathURL}/${APP_NAME}`;
  }

  _getRemoteApplicationPath(remoteUser, appName = APP_NAME) {
    return `${ROOT}/${remoteUser}/${this.pathURL}/${APP_NAME}`;
  }

  _write(filePath, data) {
    const cleanPath = this._cleanPathForFirebase(filePath);
    this.log(`Writing data to: ${cleanPath}`);
    try {
      const res = this.firebaseInst.database().ref(cleanPath).set(data);
      return res;
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
    const cleanPath = this._cleanPathForFirebase(filePath);
    const targetRef = this.firebaseInst.database().ref(cleanPath);

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
    const cleanPath = this._cleanPathForFirebase(filePath);
    this.log(`Deleting ${cleanPath}`);
    return this.firebaseInst.database().ref(cleanPath).remove();
  }
};
