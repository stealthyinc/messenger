// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();
const {JWT} = require('google-auth-library');

exports.getAccessToken = functions.https.onRequest((req, res) => {
  return new Promise((resolve, reject) => {
    var key = require('./coldmessage-ae5bc-firebase-adminsdk-er4gk-ac3637a368.json');
    var jwtClient = new JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/firebase.messaging'],
      null
    );
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res.status(200).json(tokens.access_token));
    });
  });
});
