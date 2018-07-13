import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { ActivityIndicator, AsyncStorage, NativeModules, View, Text, Platform } from 'react-native'
import styles from './Styles/BlockScreenStyle'
import { Button } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const utils = require('./../Engine/misc/utils.js');

const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

const common = require('./../common.js');

class BlockScreen extends Component {
  constructor(props) {
    super(props)
    this.state = {
      spinner: false
    }
  }
  _signOutAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    const { publicKey } = this.props
    if (!common.DEV_TESTING) {
      firebaseInstance.setFirebaseData(common.getSessionRef(publicKey), common.NO_SESSION)
    }
    this.props.initShutdown();
    // Blockstack signOut occurs in redux after the engine has emitted a shutdown event.
    this.props.clearUserData(publicKey);
    await AsyncStorage.clear();
    this.props.navigation.navigate('Auth');
  };
  _unlockEngine = async () => {
    const { publicKey } = this.props
    if (publicKey) {
      firebaseInstance.setFirebaseData(common.getSessionRef(publicKey), common.getSessionId())
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      this.setState({spinner: true})

      // Delay before starting session to allow closing session to finish writes etc.
      // Thoughts:
      //   - would be good to implement a handshake to know if this is necessary / status etc.
      const DELAY_BEFORE_START_MS = 5 * 1000;
      utils.resolveAfterMilliseconds(DELAY_BEFORE_START_MS)
      .then(() => {
        this.setState({spinner: false})
        this.setupVars(userData)
      })
      .catch((err) => {
        this.setState({spinner: false})
        console.log(`ERROR(Blockstack.js::_unlockEngine): ${err}`)
        this.setupVars(userData)
      })
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
    const activityIndicator = (this.state.spinner) ?
      (<ActivityIndicator size="large" color="#34bbed" />) : null;
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
        {activityIndicator}
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
