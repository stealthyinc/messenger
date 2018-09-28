import React from 'react';
import {
  ActivityIndicator,
  AsyncStorage,
  NativeModules,
  StatusBar,
  StyleSheet,
  View,
  Platform
} from 'react-native';
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');

class AuthLoadingScreen extends React.Component {
  constructor(props) {
    super(props);
    this._bootstrapAsync();
  }

  // Fetch the token from storage then navigate to our appropriate place
  _bootstrapAsync = async () => {
    const method = 'AuthLoadingScreen::_bootstrapAsync'
    // Android specific session creation. This has to be done or you end up with
    // lazyinit errors. It's here b/c we don't always reavist the sign in code.
    if (utils.isAndroid()) {
      const {BlockstackNativeModule} = NativeModules;

      const hasSession = false
      try {
        hasSession = await BlockstackNativeModule.hasSession()
      } catch (error) {
        // Ignore error, but log
        console.log(`INFO(${method}): error checking for existing session.`)
      }

      if (!hasSession) {
        const baseUrl = "https://www.stealthy.im"

        const config = {
          appDomain: `${baseUrl}`,
          redirectUrl: `${baseUrl}/redirectAndroid/index.html`,
          scopes:["store_write", "publish_data"]
        }

        let sessionResult = undefined
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
    if (!userData) {
      this.props.navigation.navigate('Auth');
    }
    else {
      this.props.screenProps.authWork(userData)
    }
  };

  // Render any loading content that you like here
  render() {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#34bbed"/>
        <StatusBar barStyle="default" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen)
