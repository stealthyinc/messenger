import firebase from 'react-native-firebase';
import type { Notification, NotificationOpen } from 'react-native-firebase';
import { AsyncStorage, PushNotificationIOS, Platform } from 'react-native'
import EngineActions from '../Redux/EngineRedux'

class FirebaseWrapper {
  constructor() {
    if (!firebase.auth().currentUser) {
      firebase.auth().signInAnonymouslyAndRetrieveData()
    }
    this.notification = true
    this.discovery = true
    this.multisession = true
  }

  disableNotifications() {
    this.notification = false
    this.cleanNotificationListeners()
  }

  disableDiscovery() {
    this.discovery = false
  }

  disableMultiSession() {
    this.multisession = false
  }

  cleanNotificationListeners() {
    this.onTokenRefreshListener();
    this.notificationListener();
    this.notificationOpenedListener();
    this.notificationDisplayedListener();
  }

  getFirebaseAnalytics() {
    return firebase.analytics();
  }

  getFirebaseRef(path) {
    return firebase.database().ref(path);
  }

  async setFirebaseData(path, data) {
    await firebase.database().ref(path).set(data)
  }

  async subscribeToTopic(topicname) {
    firebase.messaging().subscribeToTopic(topicname);
  }

  async unsubscribeFromTopic(topicname) {
    firebase.messaging().unsubscribeFromTopic(topicname);
  }

  async setFirebasePermissions() {
    const enabled = await firebase.messaging().hasPermission();
    if (enabled) {
      // user has permissions
      firebase.messaging().getToken().then(token => {
        AsyncStorage.setItem('token', token);
        // console.log("firebase token generated", token)
      });
      this.onTokenRefreshListener = firebase.messaging().onTokenRefresh(fcmToken => {
        // Process your token as required
        firebase.messaging().getToken().then(token => {
          AsyncStorage.setItem('token', token);
          // console.log("firebase token re-generated", token)
        });
      });
      // console.log("user has permissions")
    } else {
      // user doesn't have permission
      console.log("user doesn't have permissions")
      try {
        await firebase.messaging().requestPermission();
        // User has authorised
        console.log("firebase user has authorized")
        firebase.messaging().getToken().then(token => {
          AsyncStorage.setItem('token', token);
          // console.log("firebase token generated", token)
        });
      } catch (error) {
        // User has rejected permissions
        AsyncStorage.setItem('token', '');
        // console.log("user has rejected")
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
      if (Platform.OS === 'ios')
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
      const data = notification._data["pk"]
      store.dispatch(EngineActions.newNotification(data))
      // alert("notification opened")
    });
  }
}

// Singleton global of our firebase wrapper. Must appear after the class definition above.
//
export var firebaseInstance = new FirebaseWrapper()
