import {Platform} from 'react-native';

export const NO_SESSION = 'none'


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

module.exports.getDbChannelRootPath = function(aPublicKey,
                                               aChannelProtocol = 'public_channel_v2_0') {
  // ud --> user data:
  const context = (process.env.NODE_ENV !== 'development') ?
    `${aChannelProtocol}/ud` : `development/${aChannelProtocol}/ud`

  return `/global/${context}/${aPublicKey}`
}

module.exports.getDbChannelStatusPath = function(aPublicKey) {
  const rootPath = module.exports.getDbChannelRootPath(aPublicKey)
  return `${rootPath}/status`
}

module.exports.getDbChannelNotificationPath = function(aPublicKey) {
  const rootPath = module.exports.getDbChannelRootPath(aPublicKey)
  return `${rootPath}/message_notifications`
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
