import React from 'react'
import {
  AsyncStorage,
  NativeModules,
  StatusBar,
  StyleSheet,
  View
} from 'react-native'
import { connect } from 'react-redux'
import EngineActions from '../Redux/EngineRedux'
import Config from 'react-native-config'

const utils = require('./../Engine/misc/utils.js')

class AuthLoadingScreen extends React.Component {
  constructor (props) {
    super(props)
    this._bootstrapAsync()
  }

  // Fetch the token from storage then navigate to our appropriate place
  _bootstrapAsync = async () => {
    const method = 'AuthLoadingScreen::_bootstrapAsync'
    // Android specific session creation. This has to be done or you end up with
    // lazyinit errors. It's here b/c we don't always reavist the sign in code.
    let error
    if (utils.isAndroid()) {
      const {BlockstackNativeModule} = NativeModules

      const hasSession = false
      try {
        hasSession = await BlockstackNativeModule.hasSession()
      } catch (error) {
        // Ignore error, but log
        console.log(`INFO(${method}): error checking for existing session.`)
      }

      if (!hasSession) {
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
        } catch (error) {
          throw utils.fmtErrorStr('Failed to create Blockstack session.', method, error)
        }

        if (!sessionResult ||
            !sessionResult.hasOwnProperty('loaded') ||
            !sessionResult.loaded) {
          throw utils.fmtErrorStr('Failed to get valid Blockstack session.', method, error)
        }
      }
    }

    // TODO: This seems to not resolve / return when reloading in simulator, so
    //       setting it to undefined on Android
    // const userData = (utils.isAndroid()) ?
    //   undefined : JSON.parse(await AsyncStorage.getItem('userData'));
    const userData = JSON.parse(await AsyncStorage.getItem('userData'))
    const channels = JSON.parse(await AsyncStorage.getItem('channels'))
    if (channels) { this.props.setChannelsData(channels) }

    if (!userData) {
      this.props.navigation.navigate('Auth')
    } else {
      this.props.screenProps.authWork(userData)
    }
  };

  // Render any loading content that you like here
  render () {
    return (
      <View style={styles.container}>
        <StatusBar barStyle='default' />
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
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setChannelsData: (channels) => dispatch(EngineActions.setChannelsData(channels)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen)
