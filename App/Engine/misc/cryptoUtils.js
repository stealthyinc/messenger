// TODO: crypto is now a built in. Remove this require and the assoc
//       npm package.
const crypto = require('crypto');
// import '../../../shim.js'
// import crypto from 'crypto'
const algorithm = 'aes-256-ctr';

// Nodejs encryption with CTR
// (from: https://github.com/chris-rock/node-crypto-examples/blob/master/crypto-ctr.js)
exports.encryptStr = function (text, password) {
  const cipher = crypto.createCipher(algorithm, password);
  let crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
};

exports.decryptStr = function (text, password) {
  const decipher = crypto.createDecipher(algorithm, password);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};
