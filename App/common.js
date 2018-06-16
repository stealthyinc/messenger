import {Platform} from 'react-native';

export const NO_SESSION = 'none'

module.exports.getSessionRef = function(aPublicKey) {
  // ud --> user data:
  return (process.env.NODE_ENV === 'production') ?
    `/global/ud/${aPublicKey}/session` :
    `/global/development/ud/${aPublicKey}/session`
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
