import {Platform} from 'react-native';

export const NO_SESSION = 'none'

export const DEV_TESTING = false

module.exports.getDbRootPath = function(aPublicKey) {
  // ud --> user data:
  const context = (process.env.NODE_ENV !== 'development') ?
    'ud' : 'development/ud'

  return `/global/${context}/${aPublicKey}`
};

module.exports.getDbSessionPath = function(aPublicKey) {
  const rootPath = module.exports.getDbRootPath(aPublicKey)
  return `${rootPath}/session`
};

module.exports.getDbDiscoveryPath = function(aPublicKey) {
  const rootPath = module.exports.getDbRootPath(aPublicKey)
  return `${rootPath}/discovery`
}

module.exports.getDbNotificationPath = function(aPublicKey) {
  const rootPath = module.exports.getDbRootPath(aPublicKey)
  return `${rootPath}/notifications`
}

module.exports.getDbExistingDataPath = function(aPublicKey) {
  const rootPath = module.exports.getDbRootPath(aPublicKey)
  return `${rootPath}/existingData`
}

var __sessionId = undefined;
//
module.exports.getSessionId = function() {
  if (!__sessionId) {
    __sessionId = `${Platform.OS}-${Date.now()}`
  }

  console.log(`INFO(common.js::getSessionId): returning ${__sessionId}`)
  return __sessionId
};
