import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { AsyncStorage, NativeModules, View, Text, Platform } from 'react-native'
import styles from './Styles/BlockScreenStyle'
import { Button } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import firebase from 'react-native-firebase';

const common = require('./../common.js');

class BlockScreen extends Component {
  _signOutAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    const { publicKey } = this.props
    if (!common.DEV_TESTING) {
      await firebase.database().ref(common.getSessionRef(publicKey)).set(common.NO_SESSION)
    }
    this.props.clearUserData(publicKey);
    await AsyncStorage.clear();
    await BlockstackNativeModule.signOut();
    this.props.initShutdown();
    this.props.navigation.navigate('Auth');
  };
  _unlockEngine = async () => {
    const { publicKey } = this.props
    if (publicKey) {
      await firebase.database().ref(common.getSessionRef(publicKey)).set(common.getSessionId())
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      this.setupVars(userData)
    } else {
      this.props.navigation.navigate('Auth');
    }
  }
  setupVars = async (userData) => {
    this.props.setUserData(userData)
    const userProfile = JSON.parse(await AsyncStorage.getItem('userProfile'));
    this.props.setUserProfile(userProfile)
    const token = await AsyncStorage.getItem('token')
    this.props.setToken(token)
    this.props.navigation.navigate('App');
  }
  render () {
    return (
      <View contentContainerStyle={styles.container}>
        <Button
          onPress={this._unlockEngine}
          title="Unlock Session"
          titleStyle={{ fontSize: 16, fontWeight: "bold", color: "white"}}
          icon={{name: 'unlock-alt', type: 'font-awesome', color: "white"}}
          buttonStyle={{
            backgroundColor: "maroon",
            width: 180,
            height: 50,
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 5,
          }}
          containerStyle={{ marginTop: 40 }}
        />
        <Button
          onPress={this._signOutAsync}
          icon={{name: 'launch', color: 'white'}}
          buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#037aff'}}
          titleStyle={{ fontSize: 18, fontWeight: "bold"}}
          title='Log Out'
        />
        />
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    publicKey: EngineSelectors.getPublicKey(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setUserData: (userData) => dispatch(EngineActions.setUserData(userData)),
    setUserProfile: (userProfile) => dispatch(EngineActions.setUserProfile(userProfile)),
    clearUserData: (publicKey) => dispatch(EngineActions.clearUserData(publicKey)),
    setToken: (token) => dispatch(EngineActions.setToken(token)),
    initShutdown: () => dispatch(EngineActions.initShutdown()),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockScreen)
