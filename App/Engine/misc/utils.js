// const Config = require('Config');
import Secrets from 'react-native-config'

import {NativeModules, Platform} from 'react-native';

// Determines if a js object is empty.
//
//   from: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
//
module.exports.isEmptyObj = function (anObject) {
  return (Object.keys(anObject).length === 0 &&
          anObject.constructor === Object);
};

module.exports.throwIfUndef = function (aVarName, aVar) {
  if (aVar === undefined) {
    throw `${aVarName} is undefined`;
  }
}

module.exports.isDef = function (aVar) {
  return ((aVar !== undefined) &&
          (aVar !== null) &&
          (aVar !== ''));
}

module.exports.isObjEncrypted = function(anObj) {
  if (module.exports.isDef(anObj)) {
    try {
      if (anObj.hasOwnProperty('cipherText')) {
        return true;
      }

      const theObj = JSON.parse(anObj);
      if (theObj.hasOwnProperty('cipherText')) {
        return true;
      }
    } catch (err) {
      // Ignore.
    }
  }
  return false;
}

module.exports.deepCopyObj = function (anObj) {
  return JSON.parse(JSON.stringify(anObj));
};

module.exports.is_iOS = function() {
  return Platform.OS === 'ios';
}

module.exports.getAppContext = function(appToken) {
  let context = 'Stealthy';

  if (appToken) {
    // const validAppsMap = Secrets.VALID_APPS;
    const validAppsMap = {
      'gd04012018': 'Graphite',
    }

    if (validAppsMap.hasOwnProperty(appToken)) {
      context = validAppsMap[appToken];
    }
  }

  return context;
}

module.exports.resolveAfterMilliseconds = function (milliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve('resolved'); }, milliseconds);
  });
};

// Methods to convert the Blockstack.js / Android encryptECIES/decryptECIES methods
// to a promise (for compatibilty with our iOS encryption)
async function jsEncryptECIES(aKey, theContent) {
  return new Promise((resolve, reject) => {
    const cipherObject = encryptECIES(aKey, theContent);
    if (cipherObject) {
      resolve(cipherObject)
    } else {
      reject('ERROR encrypting provided content with given key.')
    }
  })
}
//
async function jsDecryptECIES(aKey, theCipherObject) {
  return new Promise((resolve, reject) => {
    const recovered = decryptECIES(aKey, theContent);
    // Recovering an empty string might be okay since we can encrypt an empty one.
    if (recovered && recovered !== "") {
      resolve(recovered)
    } else {
      reject('ERROR decrypting provided content with given key.')
    }
  })
}

async function iosEncryptECIES(aKey, theContent) {
  return new Promise((resolve, reject) => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.encryptCryptoppECIES(aKey, theContent, (error, cipherObject) => {
      if (error) {
        reject(error)
      } else {
        const wasString = typeof theContent === 'string'
        cipherObject['wasString'] = wasString

        resolve(cipherObject)
      }
    })
  })
}

async function iosDecryptECIES(aKey, theCipherObject) {
  return new Promise((resolve, reject) => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.decryptCryptoppECIES(aKey, theCipherObject, (error, recovered) => {
        if(error) {
          reject(error)
        } else {
          const {wasString} = theCipherObject
          resolve(wasString ? recovered.toString() : recovered)
        }
      });
  })
}

module.exports.encrypt = async function(aKey, theContent) {
  if (module.exports.is_iOS()) {
    return iosEncryptECIES(aKey, theContent)
  } else {
    return jsEncryptECIES(aKey, theContent)
  }
}

module.exports.decrypt = async function(aKey, theCipherObject) {
  if (module.exports.is_iOS()) {
    return iosDecryptECIES(aKey, theCipherObject)
  } else {
    return jsDecryptECIES(aKey, theCipherObject)
  }
}

module.exports.encryptObj = async function (aKey, anObject, enable=undefined) {
  module.exports.throwIfUndef('enable', enable)

  if (enable) {
    _throwIfKeyUndefined(aKey, 'encryptObj');
    const serializedObj = JSON.stringify(anObject);

    return module.exports.encrypt(aKey, serializedObj)
    .then(cipherObject => {
      return JSON.stringify(cipherObject);
    })
  } else {
    return new Promise((resolve, reject) => {
      resolve(anObject)
    })
  }
};

module.exports.decryptObj = async function (aKey, aStringifiedCipherObj, enable=undefined) {
  module.exports.throwIfUndef('enable', enable)
  
  if (enable) {
    _throwIfKeyUndefined(aKey, 'decryptObj');
    const cipherData = JSON.parse(aStringifiedCipherObj);

    return module.exports.decrypt(aKey, cipherData)
    .then(recovered => {
      return JSON.parse(recovered)
    })
  } else {
    return new Promise((resolve, reject) => {
      resolve(aStringifiedCipherObj)
    })
  }
};

function _throwIfKeyUndefined(aKey, aMethodName) {
  if (!aKey) {
    throw (`ERROR: In call to ${aMethodName}, aKey is not defined.`);
  }
}

module.exports.cleanPathForFirebase = function (path) {
  if ((path === null) || (path === undefined)) {
    throw (`ERROR(utils::cleanPathForFirebase): path is null or undefined.`);
  }

  return path.replace(/[\.-]/g, '_');
}
