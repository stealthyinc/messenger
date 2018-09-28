// const Config = require('Config');
import Secrets from 'react-native-config'

import {NativeModules, Platform, Dimensions} from 'react-native';
//const Platform = require('platform');
//
//const { encryptECIES, decryptECIES } = require('blockstack/lib/encryption');


module.exports.fmtErrorStr = function(anErrDescription,
                           aMethodName=undefined,
                           aCaughtErrDescription=undefined) {
  let description = (anErrDescription) ? anErrDescription : ''
  let method = (aMethodName) ? `(${aMethodName})` : ''
  let caughtDescription = (aCaughtErrDescription) ? aCaughtErrDescription : ''

  let errorString = `ERROR${method}: ${description}\n`
  if (caughtDescription) {
    errorString += caughtDescription
  }
}

// Determines if a js object is empty.
//
//   from: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
//
// FML!  Object.keys fails with a TypeError in some environments (notably when
//       running on Android in production.)
module.exports.isEmptyObj = function (anObject) {
  let isEmptyObj = false
  try {
    isEmptyObj = (anObject.constructor === Object) &&
                 (Object.keys(anObject).length === 0)
  } catch (error) {
    // Suppress
  }

  return isEmptyObj
}

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

module.exports.is_oldPad = function() {
  const {height, width} = Dimensions.get('window');
  //bad one
  //480 320
  const aspectRatio = height/width;
  if (aspectRatio<1.6 && height === 480)
    return true
  return false
}

module.exports.is_iOS = function() {
  return Platform.OS === 'ios';
}

module.exports.isAndroid = function() {
  return Platform.OS === 'android'
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
    const recovered = decryptECIES(aKey, theCipherObject);
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
  // console.log(`Encrypting with key ${aKey}:\t${theContent}\n`)
  if (module.exports.is_iOS()) {
    return iosEncryptECIES(aKey, theContent)
  } else if (module.exports.isAndroid()) {
    // The encryptContent method calls JSON.stringify on the cipher object, so
    // we have to undo that to make it compatible with the rest of our code (iOS
    // and Web).
    const { BlockstackNativeModule } = NativeModules
    const stringifiedCipherObj = await BlockstackNativeModule.encryptContent(aKey, theContent)
    return JSON.parse(stringifiedCipherObj)
  } else {
    return jsEncryptECIES(aKey, theContent)
  }
}

module.exports.decrypt = async function(aKey, theCipherObject) {
  // console.log(`Decrypting with key ${aKey}:\t${JSON.stringify(theCipherObject)}\n`)
  if (module.exports.is_iOS()) {
    return iosDecryptECIES(aKey, theCipherObject)
  } else if (module.exports.isAndroid()) {
    // The decryptContent method calls JSON.parse on the cipher object (it
    // assumes it was stringified). To make it compatible with the rest of our
    // code (iOS and Web), we have to stringify the cipher object here.
    const { BlockstackNativeModule } = NativeModules
    const stringifiedCipherObj = JSON.stringify(theCipherObject)
    const recovered = await BlockstackNativeModule.decryptContent(aKey, stringifiedCipherObj)
    // The Android decryptContent method runs in a web view inside of the Android
    // environment and for whatever reason, instead of returing a typical stringified
    // object like:
    //   "{"key":"value"}"
    // it returns one with escape characters and quotes, like:
    //   "{\"key\":\"value\"}"
    // which fails because Java is not expecting that. Fix it here with a simple
    // string replace (but scope it only to \" to prevent destroying intentional
    // backslashes):
    const recoveredWorkaround = recovered.replace(/\\"/g, '"')
    return recoveredWorkaround
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

// module.exports.safeEncrypt = async function (aPrivateKey, aPublicKey, theContent) {
//
// }
//
// module.exports.safeEncryptObj = async function (aPrivateKey, aPublicKey, anObject, enable=undefined, maxAttempts=2) {
//   module.exports.throwIfUndef('enable', enable)
//
//   if (enable) {
//     let decryptable = false
//     let attempt = 0
//
//     while (!decryptable && (attempt < maxAttempts))
//     try {
//
//     } catch (error) {
//
//     }
//   } else {
//     return anObject
//   }
// }

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

//
// Blockstack namespace and top-level domain (TLD) utils
////////////////////////////////////////////////////////////////////////////////
module.exports.DEFAULT_TLD = '.id'
module.exports.DEFAULT_TLDS = ['.id.blockstack', '.id']

module.exports.removeTld = function(
  aName, theTlds = module.exports.DEFAULT_TLDS)
{
  if (aName) {
    // Descending sort to catch .id.blockstack before .blockstack -- i.e. ignore
    // subsets of a tld in a name.
    theTlds.sort(function(a, b) {
      return b.length - a.length;
    })

    for (const tld of theTlds) {
      if (aName.endsWith(tld)) {
        return aName.substring(0, aName.indexOf(tld))
      }
    }
  }

  return aName
}

module.exports.addTld = function(aName, aTld = module.exports.DEFAULT_TLD) {
  if (aName && aTld && !aName.endsWith(aTld)) {
    return `${aName}${aTld}`
  }

  return aName
}

module.exports.removeIdTld = function(aName) {
  return module.exports.removeTld(aName, [module.exports.DEFAULT_TLD])
}

module.exports.addIdTld = function(aName) {
  return module.exports.addTld(aName)
}
