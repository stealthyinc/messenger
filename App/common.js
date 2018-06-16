import {Platform} from 'react-native';

export const NO_SESSION = 'none'

module.exports.getSessionRef = function(aPublicKey) {
  // ud --> user data:
  return (process.env.NODE_ENV === 'production') ?
    `/global/ud/${publicKey}/session` :
    `/global/development/ud/${publicKey}/session`
}

var __sessionId = undefined;
//
module.exports.getSessionId() {
  if (!__sessionId) {
    __sessionId = `${Platform.OS}-${Date.now()}`
  }
  return __sessionId
}
