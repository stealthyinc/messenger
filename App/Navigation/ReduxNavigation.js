import React from 'react'
import { Linking, AsyncStorage, BackHandler, NativeModules, View, Text, Image, Platform, PushNotificationIOS, NetInfo } from 'react-native'
import { addNavigationHelpers } from 'react-navigation'
import { createReduxBoundAddListener } from 'react-navigation-redux-helpers'
import { connect } from 'react-redux'
import AppNavigation from './AppNavigation'
import { Root } from 'native-base'
import BackgroundFetch from 'react-native-background-fetch'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
// import RNExitApp from 'react-native-exit-app'
import chatIcon from '../Images/blue512.png'
import AwesomeAlert from 'react-native-awesome-alerts'
import Spinner from 'react-native-loading-spinner-overlay'
import Toast from 'react-native-root-toast'
import firebase from 'react-native-firebase'

const common = require('./../common.js')
const utils = require('./../Engine/misc/utils.js')
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')

// Slower for Android b/c it takes longer to do things like decryption etc.
const SPINNER_TIMEOUT_S = (utils.is_iOS) ? 5 : 10        // seconds
const TOAST_TIMEOUT = 2500    // milliseconds

class ReduxNavigation extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      fbListner: false,
      isConnected: true,
      visible: false
    }
    this.publicKey = undefined
    this.shutDownSignOut = false
    //
    // IMPORTANT: we disallow timeout below b/c it results in interuption of
    //            the blockstack login process by causing a re-render with new
    //            props to componentWillMount ....
    //
    // Spinner / Activity Monitor controlling flags:
    this.spinnerTimeoutAllowed = false
    this.spinnerTimeoutRunning = false
    this.spinnerTimeoutCount = 0
    //
    this.toastTimeoutAllowed = false
    this.toastTimeoutRunning = false
    this.token = ''
  }
  componentWillMount () {
    if (!utils.is_iOS()) {
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
      console.log('[js] Received background-fetch event')
      // Required: Signal completion of your task to native code
      // If you fail to do this, the OS can terminate your app
      // or assign battery-blame for consuming too much background-time
      this.props.dispatch(EngineActions.backgroundRefresh())
      BackgroundFetch.finish(BackgroundFetch.FETCH_RESULT_NEW_DATA)
      if (Platform.OS === 'ios') {
        let number = this.props.contactMgr.getAllUnread()
        if (number > 100) { number = 99 }
        PushNotificationIOS.setApplicationIconBadgeNumber(number)
      }
    }, (error) => {
      console.log('[js] RNBackgroundFetch failed to start')
    })
    this.onTokenRefreshListener = firebase.messaging().onTokenRefresh(fcmToken => {
      // Process your token as required
      firebase.messaging().getToken()
      .then(token => {
        if (token) {
          AsyncStorage.setItem('token', token)
          // console.log("firebase token re-generated", token)
          this.token = token
        }
      })
    })
    // Optional: Query the authorization status.
    BackgroundFetch.status((status) => {
      switch (status) {
        case BackgroundFetch.STATUS_RESTRICTED:
          console.log('BackgroundFetch restricted')
          break
        case BackgroundFetch.STATUS_DENIED:
          console.log('BackgroundFetch denied')
          break
        case BackgroundFetch.STATUS_AVAILABLE:
          console.log('BackgroundFetch is enabled')
          break
      }
    })
  }

  componentDidMount () {
    NetInfo.isConnected.addEventListener('connectionChange', this.handleConnectivityChange)
  }

  handleConnectivityChange = isConnected => {
    this.setState({ isConnected })
  };

  componentWillReceiveProps = (nextProps) => {
    if (nextProps.engineShutdown) {
      // #FearThis  - Changes can result in loss of time, efficiency, users &
      //              data.
      this.___finishLogOutSequence()
    }
    // spinner
    if (this.spinnerTimeoutAllowed && nextProps.spinnerFlag) {
      this._setSpinnerTimeout(SPINNER_TIMEOUT_S)
    }
    // toast
    if (this.toastTimeoutAllowed &&
        !this.toastTimeoutRunning &&
        nextProps.toastFlag) {
      this.toastTimeoutRunning = true
      setTimeout(() => {
        this.props.dispatch(EngineActions.setToastData(false, ''))
        this.toastTimeoutRunning = false
      }, TOAST_TIMEOUT);
	  }
  }

  componentWillUnmount () {
    if (!utils.is_iOS()) {
      BackHandler.removeEventListener('hardwareBackPress')
    }
    NetInfo.isConnected.removeEventListener('connectionChange', this.handleConnectivityChange)
    this.onTokenRefreshListener()
  }

  // A timeout timer that can have the timeout duration updated while it's counting.
  // On timeout, dispatches an engine action that results in new props to disable
  // the spinner in the render method:
  //
  _setSpinnerTimeout = async (durationSec) => {
    // Update the timeout timer on the spinner (prevents flicker and shortened
    // time-out intervals on subsequent calls before expiry)
    this.spinnerTimeoutCount = durationSec

    // Block subsequent calls to this method from starting a second time-out loop
    // count.
    if (!this.spinnerTimeoutRunning) {
      this.spinnerTimeoutRunning = true

      try {
        // Loop countdown until timeout and then dispatch a prop change to make
        // the spinner disappear
        while (this.spinnerTimeoutCount > 0) {
          const sleepResult = await utils.resolveAfterMilliseconds(1000)
          this.spinnerTimeoutCount--
        }
        this.props.dispatch(EngineActions.setSpinnerData(false, ''))
      } catch (error) {
        // suppress
      } finally {
        this.spinnerTimeoutRunning = false
      }
    }
  }

  _tokenRefresh = (publicKey) => {
    if (this.token) {
      console.log("firebase token re-generated", this.token)
      const notificationPath = common.getDbNotificationPath(publicKey)
      const ref = firebaseInstance.getFirebaseRef(notificationPath)
      ref.set({token: this.token, enabled: true})
      .then(() => {
        console.log('REF IS SET')
      })
      .catch(error => console.log('PB FB ERROR', error))
    }
  }

  _authWork = async (userData) => {
    this.spinnerTimeoutAllowed = false    // Never stop the spinner on login
    this.toastTimeoutAllowed = false
    this.shutDownSignOut = false
    this.publicKey = userData['appPublicKey']
    const sessionId = common.getSessionId()

    this.props.dispatch(EngineActions.setPublicKey(this.publicKey))
    this.props.dispatch(EngineActions.setSession(sessionId))
    this.props.dispatch(EngineActions.setUserData(userData))

    try {
      const userProfile = JSON.parse(await AsyncStorage.getItem('userProfile'))
      if (userProfile) {
        this.props.dispatch(EngineActions.setUserProfile(userProfile))
      }
    } catch (error) {
      // suppress
    }

    this.props.dispatch(EngineActions.setToken(this.token))
    this.props.dispatch({ type: 'Navigation/NAVIGATE', routeName: 'App' })
    this.spinnerTimeoutAllowed = true    // The spinner can timout after login complete
    this.toastTimeoutAllowed = true

    this._tokenRefresh(this.publicKey)
  }

/// /////////////////////////////////////////////////////////////////////////////
//  Begin #FearThis: - Changes can result in loss of time, efficiency, users, &
//                     data.
//
//  Logout/shutdown involves shutting down the engine and waiting for that to
//  complete before signing out of blockstack / other operations (otherwise the
//  iOS code will crash causing problems).
//
//  The logout sequence can be triggered by a database event indicating that
//  we've lost session lock or from a user clicking on the log out button. The
//  next step is to request the engine shutdown and then wait for the
//  'engineShutDown' to come through props or a time-out to occur. After this
//  has occured, we then do UI cleanup and clearing of user data / async storage
//  before signing out of blockstack.
//
/// /////////////////////////////////////////////////////////////////////////////

  ___startLogOutSequence = async () => {
    this.spinnerTimeoutAllowed = false    // Never stop the spinner on logouts
    this.toastTimeoutAllowed = false
    const method = 'ReduxNavigation::___startLogOutSequence'
    this.props.dispatch(EngineActions.initShutdown())

    // Give Android more time (we've disabled the emit event for android in the
    // engine, b/c it gets cached/stored and on the next sign in, comes into
    // componentWillReceiveProps in this class and calls sign out, resulting in
    // a crash)
    const TIMEOUT_BEFORE_SHUTDOWN_MS = (utils.isAndroid()) ? 10 * 1000 : 6 * 1000
    try {
      await utils.resolveAfterMilliseconds(TIMEOUT_BEFORE_SHUTDOWN_MS)
    } catch (error) {
      console.log(`ERROR(${method}): error during wait for engine shutdown.\n${error}`)
    } finally {
      // Only call ___finishLogOutSequence once (it may have been called before the
      // timer above resolves):
      if (!this.shutDownSignOut) {
        console.log(`INFO(${method}): timed out waiting for engine shutdown. Forcing shut down.`)
        this.___finishLogOutSequence()
      } else {
        console.log(`INFO(${method}): Engine shut down successfully before force shut down timer.`)
      }
    }
  }

  ___finishLogOutSequence = async () => {
    if (!this.shutDownSignOut) {
      this.shutDownSignOut = true

      if (this.publicKey) {
        this.props.dispatch(EngineActions.clearUserData(this.publicKey))
      }

      // PBJ was wiping all of AsyncStorage and then re-writing the token:
      // await AsyncStorage.clear()
      // Instead we'll just wipe out things he wrote and keep the stuff we're
      // now persisting:
      for (const itemKey of ['token', 'userProfile', 'userData', 'channels', 'appVersion', 'reducerVersion']) {
        try {
          await AsyncStorage.removeItem(itemKey)
          console.log(`INFO(ReduxNavigation::___finishLogOutSequence): removed ${itemKey} from AsyncStorage.`)
        } catch (error) {
          // Suppress
        }
      }
      const { token } = this.props
      AsyncStorage.setItem('token', token)

      const {BlockstackNativeModule} = NativeModules
      if (utils.is_iOS()) {
        await BlockstackNativeModule.signOut()
      } else if (utils.isAndroid()) {
        await BlockstackNativeModule.signUserOut()
      } else {
        // TODO: something on desktop / web / blockstack.js
      }
      this.publicKey = undefined

      // if (utils.is_iOS()) { this.props.dispatch({ type: 'Navigation/NAVIGATE', routeName: 'Auth' }) } else { RNExitApp.exitApp() }
      this.props.dispatch({ type: 'Navigation/NAVIGATE', routeName: 'Auth' })
    }
  }


/// /////////////////////////////////////////////////////////////////////////////
//  End #FearThis
/// /////////////////////////////////////////////////////////////////////////////

  render () {
    const hasEngineFault = !!this.props.engineFault
    if (hasEngineFault) {
      // console.log("Engine Fault", this.props.engineFault, this.props.userData)
      return (
        <AwesomeAlert
          show={hasEngineFault}
          showProgress={false}
          title='Stealthy Error'
          message='Engine in a bad state'
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={false}
          showCancelButton
          showConfirmButton
          cancelText='Restart Engine'
          confirmText='Logout'
          cancelButtonColor='#34bbed'
          confirmButtonColor='#DD6B55'
          onCancelPressed={() => {
            this.props.dispatch(EngineActions.restartEngine(this.props.userData))
          }}
          onConfirmPressed={() => {
            this.___startLogOutSequence()
          }}
        />
      )
    }
    else if (!this.state.isConnected) {
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
          <Image
            style={{width: 150, height: 150}}
            source={chatIcon}
          />
          <Text style={{fontSize: 30, fontWeight: 'bold', marginTop: 40}}>
            No internet connection!
          </Text>
        </View>
      )
    }
    else {
      return (
        <Root>
          <Spinner visible={this.props.spinnerFlag} textContent={this.props.spinnerMessage} textStyle={{color: '#FFF'}} />
          <Toast
	            visible={this.props.toastFlag}
	            position={-60}
	            shadow={false}
	            animation={false}
	            hideOnPress={true}
	            backgroundColor='#49c649'>
            <Text style={{fontWeight: 'bold'}}>
              {this.props.toastMessage}
            </Text>
          </Toast>
          <AppNavigation
            screenProps={{logout: () => this.___startLogOutSequence(), authWork: (userData) => this._authWork(userData)}}
            navigation={addNavigationHelpers({dispatch: this.props.dispatch, state: this.props.nav, addListener: createReduxBoundAddListener('root')})}
          />
        </Root>
      )
    }
  }
}

const mapStateToProps = (state) => {
  return {
    nav: state.nav,
    spinnerFlag: EngineSelectors.getSpinnerFlag(state),
    spinnerMessage: EngineSelectors.getSpinnerMessage(state),
    toastFlag: EngineSelectors.getToastFlag(state),
    toastMessage: EngineSelectors.getToastMessage(state),
    contactMgr: EngineSelectors.getContactMgr(state),
    publicKey: EngineSelectors.getPublicKey(state),
    engineFault: EngineSelectors.getEngineFault(state),
    engineShutdown: EngineSelectors.getEngineShutdown(state),
    userData: EngineSelectors.getUserData(state),
    token: EngineSelectors.getToken(state),
    appVersion: EngineSelectors.getAppVersion(state),
    channels: EngineSelectors.getChannelsData(state)
  }
}

export default connect(mapStateToProps)(ReduxNavigation)
