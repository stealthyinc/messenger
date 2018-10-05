import '../Config'
import DebugConfig from '../Config/DebugConfig'
import React, { Component } from 'react'
import { Provider } from 'react-redux'
import RootContainer from './RootContainer'
import createStore from '../Redux'
import { AppState, AsyncStorage, PushNotificationIOS, Platform, Linking } from 'react-native'
import LinkRoutes from './LinkRoutes';
import EngineActions from '../Redux/EngineRedux'
import Amplify, { Analytics } from 'aws-amplify';
import aws_exports from '../../aws-exports';

Amplify.configure(aws_exports);

const { firebaseInstance } = require('../Engine/firebaseWrapper.js')

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
  state = {
    appState: AppState.currentState
  }
  async componentWillMount () {
    // When key is wrong and mac error happens
    // await AsyncStorage.clear()
    firebaseInstance.setFirebasePermissions()
  }
  async componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
    firebaseInstance.setFirebaseNotifications(store)
    Linking.addEventListener('url', event => this.handleOpenURL(event.url));
    Linking.getInitialURL().then(url => url && this.handleOpenURL(url));
  }
  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    firebaseInstance.cleanNotificationListeners()
    Linking.removeEventListener('url', this.handleOpenURL);
  }
  handleOpenURL(url) {
    const path = url.split(':/')[1];
    LinkRoutes(path, store);
  }
  _handleAppStateChange = (nextAppState) => {
    if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!')
      store.dispatch(EngineActions.foreGround())
      if (Platform.OS === 'ios')
        PushNotificationIOS.setApplicationIconBadgeNumber(0)
    }
    else if (this.state.appState.match(/active/) && nextAppState === 'inactive') {
      console.log('App has gone to the background!')
      store.dispatch(EngineActions.backGround())
    }
    this.setState({appState: nextAppState});
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
