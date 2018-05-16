// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.sendNotification = functions.database
.ref("/global/notifications/{userId}/{pushId}")
.onWrite(event => {
  const snapshot = event.data;
  const userId = event.params.userId;
  //if (snapshot.previous.val()) {
    //return;
  //}
  //if (snapshot.val().name != "ADMIN") {
    //return;
  //}
  //const text = snapshot.val().text;
  const payload = {
    notification: {
      title: `Stealthy IM`,
      body: `New Message`,
    }
  };
  return admin
    .database()
    .ref(`global/notifications/${userId}`)
    .once('value')
    .then(data => {
      if (data.key) {
        //hardcoded notification key to pbj's device
        //need to get/decrypt and send this to the user
        //return admin.messaging().sendToDevice('chrZGSIpC74:APA91bEv7c6qHHWCzKyaG7h5ykd9J6CIh-LhshwdzFvNjXhyHmHBwlnPVgJLr_dgDbd3akOb0Ls6RTVfc4Sah5rMFSfUEQFTiK5xr_VnRMA356q1cwedymi_meeVpHMaUpQ7PyHF8CGT', payload);
        return admin.messaging().sendToDevice('decryptandloaduserdevicetoken', payload);
      }
    });
});
