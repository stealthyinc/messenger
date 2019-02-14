import React from 'react'
import {
  AsyncStorage,
  Image,
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import Config from 'react-native-config'
import { getAppstoreAppVersion } from "react-native-appstore-version-checker";
import chatIcon from '../Images/blue128.png'

const { Timer } = require('./../Engine/misc/timer.js')

const utils = require('./../Engine/misc/utils.js')

class AuthLoadingScreen extends React.Component {
  constructor (props) {
    super(props)
    this.loadTimer = new Timer('AuthLoadingScreen: constructor')
    this.checkAppVersion()
    this.props.setSpinnerData(true, '')
  }
  checkAppVersion = async () => {
    this.loadTimer.logEvent('    checkAppVersion: entered.')
    let appName = ''
    if (utils.is_iOS()) {
      appName = '1382310437'
    }
    else {
      appName = 'com.stealthy'
    }
    this.loadTimer.logEvent('    getAppstoreAppVersion: calling.')
    getAppstoreAppVersion(appName) //put any apps packageId here
    .then(appVersion => {
      this.loadTimer.logEvent('    getAppstoreAppVersion: got response.')
      console.log("stealthy app version on app store", appVersion);
      //pb's hack for version checking
      this._bootstrapAsync(appVersion)
    })
    .catch(err => {
      this.loadTimer.logEvent('    getAppstoreAppVersion: got error.')
      console.log("app store error occurred", err);
      this._bootstrapAsync(null)
    });
  }
  // Fetch the token from storage then navigate to our appropriate place
  _bootstrapAsync = async (onlineAppVersion) => {
    this.loadTimer.logEvent('    _bootstrapAsync: entered.')

    const method = 'AuthLoadingScreen::_bootstrapAsync'
    // Android specific session creation. This has to be done or you end up with
    // lazyinit errors. It's here b/c we don't always reavist the sign in code.
    let error
    if (utils.isAndroid()) {
      const {BlockstackNativeModule} = NativeModules

      this.loadTimer.logEvent('    _bootstrapAsync:  checking for blockstack session.')
      const hasSession = false
      try {
        hasSession = await BlockstackNativeModule.hasSession()
        this.loadTimer.logEvent(`    _bootstrapAsync:  blockstack hasSession=${hasSession}`)
      } catch (error) {
        this.loadTimer.logEvent(`    _bootstrapAsync:  blockstack hasSession errored out`)
        // Ignore error, but log
        console.log(`INFO(${method}): error checking for existing session.`)
      }

      if (!hasSession) {
        this.loadTimer.logEvent(`    _bootstrapAsync:  creating blockstack session`)
        const baseUrl = 'https://www.stealthy.im'

        // Unfortunately this doesn't seem to work, so we've hard-coded some
        // stuff from @Friedger into the Kotlin that gets called by the
        // BlockstackNativeModule createSession code.
        //
        const config = {
          appDomain: `${baseUrl}`,
          redirectUrl: `/redirectAndroid/index.html`,
          redirectPath: `/redirectAndroid/index.html`,
          // redirectUrl: `${baseUrl}/redirectAndroid/index.html`,
          // redirectPath: `${baseUrl}/redirectAndroid/index.html`,
          // redirectUrl: `${baseUrl}/redirect.html`,
          // redirectUrl: 'https://flamboyant-darwin-d11c17.netlify.com/',
          scopes: ['store_write', 'publish_data']
        }

        let sessionResult
        try {
          sessionResult = await BlockstackNativeModule.createSession(config)
          this.loadTimer.logEvent(`    _bootstrapAsync:  got blockstack session result`)
        } catch (error) {
          this.loadTimer.logEvent(`    _bootstrapAsync:  got blockstack session errored out`)

          const errMsg = utils.fmtErrorStr('Failed to create Blockstack session.', method, error)
          console.log(errMsg)
          throw errMsg
        }

        if (!sessionResult ||
            !sessionResult.hasOwnProperty('loaded') ||
            !sessionResult.loaded) {
          const errMsg = utils.fmtErrorStr('Failed to get valid Blockstack session.', method, error)
          console.log(errMsg)
          throw errMsg
        }
      }

      this.loadTimer.logEvent(`    _bootstrapAsync:  android specific work completed`)
    }

    this.loadTimer.logEvent(`    _bootstrapAsync:  fetching items from AsyncStorage`)
    // TODO: This seems to not resolve / return when reloading in simulator, so
    //       setting it to undefined on Android
    // const userData = (utils.isAndroid()) ?
    //   undefined : JSON.parse(await AsyncStorage.getItem('userData'));
    const userData = JSON.parse(await AsyncStorage.getItem('userData'))
    const channels = JSON.parse(await AsyncStorage.getItem('channels'))
    const appVersion = JSON.parse(await AsyncStorage.getItem('appVersion'))
    this.loadTimer.logEvent(`    _bootstrapAsync:  completed fetching items from AsyncStorage`)

    this.props.setAppVersion(appVersion)
    if (channels) { this.props.setChannelsData(channels) }

    this.loadTimer.logEvent(`    _bootstrapAsync:  completed up to auth/update navigation.`)
    console.log(this.loadTimer.getEvents())
    this.loadTimer = undefined

    if (!userData) {
      this.props.setSpinnerData(false, '')
      this.props.navigation.navigate('Auth')
    }
    else if (parseFloat(appVersion) < parseFloat(onlineAppVersion)) {
      this.props.setSpinnerData(false, '')
      this.props.navigation.navigate('Update')
    }
    else {
      this.props.screenProps.authWork(userData)
    }
  };

  // Render any loading content that you like here
  render () {
    return (
      <View style={styles.container}>
        <StatusBar barStyle='default' />
        <Image
          source={chatIcon}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})

const mapStateToProps = (state) => {
  return {
    appVersion: EngineSelectors.getAppVersion(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setAppVersion: (appVersion) => dispatch(EngineActions.setAppVersion(appVersion)),
    setChannelsData: (channels) => dispatch(EngineActions.setChannelsData(channels)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen)
