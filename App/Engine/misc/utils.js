// const Config = require('Config');
import Secrets from 'react-native-config'

// TODO: get these through Blockstack iOS API
// const { encryptECIES, decryptECIES } = require('blockstack/lib/encryption');
function encryptECIES(arg1, arg2) {
  throw 'TODO: in utils.js, need to get encryption methods from iOS Blockstack'
}

function decryptECIES(arg1, arg2) {
  throw 'TODO: in utils.js, need to get encryption methods from iOS Blockstack'
}


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

module.exports.encryptSerializedObj = function (aKey, aSerializedObj) {
  _throwIfKeyUndefined(aKey, 'encryptSerializedObj');

  const cipherData = encryptECIES(aKey, aSerializedObj);
  const stringifyCipher = JSON.stringify(cipherData);
  return stringifyCipher;
};

module.exports.encryptObj = function (aKey, anObject) {
  _throwIfKeyUndefined(aKey, 'encryptObj');

  const serializedObj = JSON.stringify(anObject);
  return module.exports.encryptSerializedObj(aKey, serializedObj);
};

module.exports.decryptToSerializedObj = function (aKey, aStringifiedCipherObj) {
  _throwIfKeyUndefined(aKey, 'decryptToSerializedObj');

  const cipherData = JSON.parse(aStringifiedCipherObj);
  const serializedObj = decryptECIES(aKey, cipherData);
  return serializedObj;
};

module.exports.decryptToObj = function (aKey, aStringifiedCipherObj) {
  _throwIfKeyUndefined(aKey, 'decryptToObj');

  const serializedObj = module.exports.decryptToSerializedObj(aKey, aStringifiedCipherObj);
  const object = JSON.parse(serializedObj);
  return object;
};

function _throwIfKeyUndefined(aKey, aMethodName) {
  if (!aKey) {
    throw (`ERROR: In call to ${aMethodName}, aKey is not defined.`);
  }
}

module.exports.cleanPathForFirebase = function (path) {
  return path.replace(/[\.-]/g, '_');
}
