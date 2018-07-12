import {Platform} from 'react-native';

export const NO_SESSION = 'none'

export const DEV_TESTING = false

module.exports.getSessionRef = function(aPublicKey) {
  return `${module.exports.getRootRef(aPublicKey)}session`
};

module.exports.getRootRef = function(aPublicKey) {
  // ud --> user data:
  return `/global/${process.env.NODE_ENV}/${aPublicKey}/ud/`
};

var __sessionId = undefined;
//
module.exports.getSessionId = function() {
  if (!__sessionId) {
    __sessionId = `${Platform.OS}-${Date.now()}`
  }

  console.log(`INFO(common.js::getSessionId): returning ${__sessionId}`)
  return __sessionId
};
