import '../Config'
import DebugConfig from '../Config/DebugConfig'
import React, { Component } from 'react'
import { Provider } from 'react-redux'
import RootContainer from './RootContainer'
import createStore from '../Redux'
import { AsyncStorage, PushNotificationIOS } from 'react-native'

import firebase from 'react-native-firebase';
import type { Notification, NotificationOpen } from 'react-native-firebase';
import EngineActions from '../Redux/EngineRedux'

// create our store
const store = createStore()
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
      store.dispatch(EngineActions.newNotification(notification._body))
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
