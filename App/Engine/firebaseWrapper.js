import firebase from 'react-native-firebase';
import type { Notification, NotificationOpen } from 'react-native-firebase';
import { AsyncStorage, PushNotificationIOS } from 'react-native'

class FirebaseWrapper {
  constructor() {
    if (!firebase.auth().currentUser) {
      firebase.auth().signInAnonymouslyAndRetrieveData()
    }
    this.notifications = true
    this.discovery = true
    this.multisession = true
  }

  disableNotifications() {
    this.notification = false
    this.cleanNotificationListners()
  }

  disableDiscovery() {
    this.discovery = false
  }

  disableMultiSession() {
    this.multisession = false
  }

  cleanNotificationListners() {
    this.onTokenRefreshListener();
    this.notificationListener();
    this.notificationOpenedListener();
    this.notificationDisplayedListener();
  }

  getFirebaseRef(path) {
    return firebase.database().ref(path);
  }

  async setFirebaseData(path, data) {
    await firebase.database().ref(path).set(data)
  }

  async setFirebasePermissions() {
    const enabled = await firebase.messaging().hasPermission();
    if (enabled) {
      // user has permissions
      firebase.messaging().getToken().then(token => {
        AsyncStorage.setItem('token', token);
        // console.log("token", token)
      });
      this.onTokenRefreshListener = firebase.messaging().onTokenRefresh(fcmToken => {
        // Process your token as required
        firebase.messaging().getToken().then(token => {
          AsyncStorage.setItem('token', token);
          // console.log("token", token)
        });
      });
      // console.log("user has permissions")
    } else {
      // user doesn't have permission
      console.log("user doesn't have permissions")
      try {
        await firebase.messaging().requestPermission();
        // User has authorised
        console.log("user has authorized")
      } catch (error) {
        // User has rejected permissions
        console.log("user has rejected")
      }
    }
  }

  async setFirebaseNotifications(store) {
    const notificationOpen: NotificationOpen = await firebase.notifications().getInitialNotification();
    if (notificationOpen) {
      // App was opened by a notification
      // Get the action triggered by the notification being opened
      const action = notificationOpen.action;
      // Get information about the notification that was opened
      const notification: Notification = notificationOpen.notification;
      console.log("notification initial open")
      // alert("notification initial open")
    }
    this.notificationDisplayedListener = firebase.notifications().onNotificationDisplayed((notification: Notification) => {
      // Process your notification as required
      // ANDROID: Remote notifications do not contain the channel ID. You will have to specify this manually if you'd like to re-display the notification.
      console.log("notification displayed")
      PushNotificationIOS.setApplicationIconBadgeNumber(1)
      // alert("notification displayed")
    });
    this.notificationListener = firebase.notifications().onNotification((notification: Notification) => {
      // Process your notification as required
      console.log("notification on")
    });
    this.notificationOpenedListener = firebase.notifications().onNotificationOpened((notificationOpen: NotificationOpen) => {
      // Get the action triggered by the notification being opened
      const action = notificationOpen.action;
      // Get information about the notification that was opened
      const notification: Notification = notificationOpen.notification;
      // console.log("notification opened", notification)
      const data = notification._data["gcm.notification.data"]["pk"]
      store.dispatch(EngineActions.newNotification(data))
      // alert("notification opened")
    });
  }
}

// Singleton global of our firebase wrapper. Must appear after the class definition above.
//
export var firebaseInstance = new FirebaseWrapper()
