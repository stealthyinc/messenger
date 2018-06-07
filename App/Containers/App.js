import '../Config'
import DebugConfig from '../Config/DebugConfig'
import React, { Component } from 'react'
import { Provider } from 'react-redux'
import RootContainer from './RootContainer'
import createStore from '../Redux'
import { AsyncStorage, PushNotificationIOS } from 'react-native'

import firebase from 'react-native-firebase';
import type { Notification, NotificationOpen } from 'react-native-firebase';
// import PushNotification from 'react-native-push-notification';

// create our store
const store = createStore()

// PushNotification.configure({

//     // (optional) Called when Token is generated (iOS and Android)
//     onRegister: function(token) {
//         console.log( '################TOKEN:', token );
//     },

//     // (required) Called when a remote or local notification is opened or received
//     onNotification: function(notification) {
//         console.log( '################NOTIFICATION:', notification );

//         // process the notification

//         // required on iOS only (see fetchCompletionHandler docs: https://facebook.github.io/react-native/docs/pushnotificationios.html)
//         notification.finish(PushNotificationIOS.FetchResult.NoData);
//     },

//     // ANDROID ONLY: GCM Sender ID (optional - not required for local notifications, but is need to receive remote push notifications)
//     // senderID: "YOUR GCM SENDER ID",

//     // IOS ONLY (optional): default: all - Permissions to register.
//     permissions: {
//         alert: true,
//         badge: true,
//         sound: true
//     },

//     // Should the initial notification be popped automatically
//     // default: true
//     popInitialNotification: true,

//     /**
//       * (optional) default: true
//       * - Specified if permissions (ios) and token (android and ios) will requested or not,
//       * - if not, you must call PushNotificationsHandler.requestPermissions() later
//       */
//     requestPermissions: true,
// });

/**
 * Provides an entry point into our application.  Both index.ios.js and index.android.js
 * call this component first.
 *
 * We create our Redux store here, put it into a provider and then bring in our
 * RootContainer.
 *
 * We separate like this to play nice with React Native's hot reloading.
 */
class App extends Component {
  async componentWillMount () {
    // const recepient = "0231debdb29c8761a215619b2679991a1db8006c953d1fa554de32e700fe89feb9"
    // const npath = `/global/notifications/${recepient}/`
    // firebase.database().ref(npath).on('child_added', function(childSnapshot, prevChildKey) {
    //   console.log('Snapshot', childSnapshot.key, childSnapshot.val())
    //   const notification = new firebase.notifications.Notification()
    //   .setNotificationId('notificationId')
    //   .setTitle('Stealthy IM')
    //   .setBody('New Stealthy Message')
    //   .setData({
    //     key1: 'value1',
    //     key2: 'value2',
    //   });
    //   notification.ios.setBadge(1);
    //   firebase.notifications().displayNotification(notification)
    // });
    const enabled = await firebase.messaging().hasPermission();
    if (enabled) {
      // user has permissions
      await firebase.messaging().getToken().then(token => {
        AsyncStorage.setItem('token', token);
        // console.log("token", token)
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
  async componentDidMount() {
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
      console.log("notification opened")
      // alert("notification opened")
    });
  }
  componentWillUnmount() {
    this.notificationListener();
    this.notificationOpenedListener();
    this.notificationDisplayedListener();
  }
  render () {
    return (
      <Provider store={store}>
        <RootContainer />
      </Provider>
    )
  }
}

// allow reactotron overlay for fast design in dev mode
export default DebugConfig.useReactotron
  ? console.tron.overlay(App)
  : App
