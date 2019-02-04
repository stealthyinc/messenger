// Abstract base class for IO services.
//
//   Pattern from: https://ilikekillnerds.com/2015/06/abstract-classes-in-javascript/
//
module.exports = class BaseIO {
  constructor () {
    if (this.constructor === BaseIO) {
      throw new TypeError('Abstract class "BaseIO" cannot be instantiated directly.')
    }

    if (this.writeLocalFile === undefined) {
      throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
                          'writeLocalFile(localUser, fileName, data)')
    }

    if (this.readLocalFile === undefined) {
      throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
                          'readLocalFile(localUser, fileName)')
    }

    if (this.deleteLocalFile === undefined) {
      throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
                          'deleteLocalFile(localUser, filename)')
    }

    if (this.readRemoteFile === undefined) {
      throw new TypeError('Classes extending the BaseIO abstract class must implement: ' +
                          'readRemoteFile(remoteUser, fileName)')
    }
  }
}
