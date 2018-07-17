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

class AuthLoadingScreen extends React.Component {
  constructor(props) {
    super(props);
    this._bootstrapAsync();
  }

  // Fetch the token from storage then navigate to our appropriate place
  _bootstrapAsync = async () => {
    const userData = JSON.parse(await AsyncStorage.getItem('userData'));
    if (!userData) {
      this.props.navigation.navigate('Auth');
    }
    else {
      const publicKey = userData['appPublicKey']
      this.props.setPublicKey(publicKey)
      const ref = firebaseInstance.getFirebaseRef(common.getDbSessionPath(publicKey));
      await ref.once('value')
      .then((snapshot) => {
        if (snapshot.exists() && (!common.DEV_TESTING || snapshot.val() === common.getSessionId())) {
          this.setupVars(userData)
        }
        else {
          this.props.setSession(snapshot.val())
          this.props.navigation.navigate('Block');
        }
      })
    }
  };

  setupVars = async (userData) => {
    this.props.setUserData(userData)
    const userProfile = JSON.parse(await AsyncStorage.getItem('userProfile'));
    this.props.setUserProfile(userProfile)
    const token = await AsyncStorage.getItem('token')
    this.props.setToken(token)
    this.props.navigation.navigate('App');
  }

  // Render any loading content that you like here
  render() {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
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
    setUserData: (userData) => dispatch(EngineActions.setUserData(userData)),
    setPublicKey: (publicKey) => dispatch(EngineActions.setPublicKey(publicKey)),
    setUserProfile: (userProfile) => dispatch(EngineActions.setUserProfile(userProfile)),
    setToken: (token) => dispatch(EngineActions.setToken(token)),
    setSession: (session) => dispatch(EngineActions.setSession(session)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen)
