import React from 'react'
import { AsyncStorage, BackHandler, Platform, NativeModules } from 'react-native'
import { addNavigationHelpers } from 'react-navigation'
import { createReduxBoundAddListener } from 'react-navigation-redux-helpers'
import { connect } from 'react-redux'
import AppNavigation from './AppNavigation'
import { Root } from "native-base";
import BackgroundFetch from "react-native-background-fetch";
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import firebase from 'react-native-firebase';
const common = require('./../common.js');

class ReduxNavigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fbListner: false
    }
    this.ref = undefined;
  }
  componentWillMount () {
    if (Platform.OS !== 'ios') {
      BackHandler.addEventListener('hardwareBackPress', () => {
        const { dispatch, nav } = this.props
        // change to whatever is your first screen, otherwise unpredictable results may occur
        if (nav.routes.length === 1 && (nav.routes[0].routeName === 'LaunchScreen')) {
          return false
        }
        // if (shouldCloseApp(nav)) return false
        dispatch({ type: 'Navigation/BACK' })
        return true
      })
    }
    // Configure it.
    BackgroundFetch.configure({
      minimumFetchInterval: 15, // <-- minutes (15 is minimum allowed)
      stopOnTerminate: false,   // <-- Android-only,
      startOnBoot: true         // <-- Android-only
    }, () => {
      console.log("[js] Received background-fetch event");
      // Required: Signal completion of your task to native code
      // If you fail to do this, the OS can terminate your app
      // or assign battery-blame for consuming too much background-time
      this.props.dispatch(EngineActions.backgroundRefresh())
      BackgroundFetch.finish(BackgroundFetch.FETCH_RESULT_NEW_DATA);
    }, (error) => {
      console.log("[js] RNBackgroundFetch failed to start");
    });

    // Optional: Query the authorization status.
    BackgroundFetch.status((status) => {
      switch(status) {
        case BackgroundFetch.STATUS_RESTRICTED:
          console.log("BackgroundFetch restricted");
          break;
        case BackgroundFetch.STATUS_DENIED:
          console.log("BackgroundFetch denied");
          break;
        case BackgroundFetch.STATUS_AVAILABLE:
          console.log("BackgroundFetch is enabled");
          break;
      }
    });
  }
  componentWillReceiveProps (nextProps) {
    const { publicKey } = nextProps
    if (publicKey && !this.ref) {
      const sessionRef = common.getRootRef(publicKey)
      this.ref = firebase.database().ref(sessionRef)
      this.ref.on('child_changed', (childSnapshot, prevChildKey, publicKey) => {
        const session = childSnapshot.val()
        if (session !== common.getSessionId())
          this._signOutAsync(publicKey)
      });
    }
  }
  componentWillUnmount () {
    if (Platform.OS !== 'ios') {
      BackHandler.removeEventListener('hardwareBackPress')
    }
  }
  _signOutAsync = async (publicKey) => {
    const {BlockstackNativeModule} = NativeModules;
    if (this.ref) {
      this.ref.off();
    }
    this.props.dispatch(EngineActions.clearUserData(publicKey));
    await AsyncStorage.clear();
    await BlockstackNativeModule.signOut();
    this.props.dispatch({ type: 'Navigation/NAVIGATE', routeName: 'Auth' })
  };
  render () {
    return (
      <Root>
        <AppNavigation navigation={addNavigationHelpers({dispatch: this.props.dispatch, state: this.props.nav, addListener: createReduxBoundAddListener('root') })} />
      </Root>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    nav: state.nav,
    publicKey: EngineSelectors.getPublicKey(state),
  }
}

export default connect(mapStateToProps)(ReduxNavigation)
