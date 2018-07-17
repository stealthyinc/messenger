import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { 
  ActivityIndicator, 
  AsyncStorage, 
  NativeModules, 
  Image,
  View, 
  Text, 
  StyleSheet,
  ScrollView, 
  Platform 
} from 'react-native'
import { Button, SocialIcon } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const utils = require('./../Engine/misc/utils.js');

const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

const common = require('./../common.js');
import chatIcon from '../Images/blue512.png';

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
      firebaseInstance.setFirebaseData(common.getDbSessionPath(publicKey), common.NO_SESSION)
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
      firebaseInstance.setFirebaseData(common.getDbSessionPath(publicKey), common.getSessionId())
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{flexDirection: 'row', marginTop: 40}}>
          <SocialIcon
            style={{width: 45, height: 45}}
            type='twitter'
            onPress={() => Linking.openURL('https://twitter.com/stealthyim').catch(err => console.error('An error occurred', err))}
          />
          <SocialIcon
            style={{width: 45, height: 45}}
            type='medium'
            onPress={() => Linking.openURL('https://medium.com/@stealthyim').catch(err => console.error('An error occurred', err))}
          />
          <Button
            onPress={() => console.log('boo')}
            dispabled
            title=""
            titleStyle={{ fontSize: 16, fontWeight: "bold", color: "#34bbed"}}
            buttonStyle={{
              marginLeft: 20,
              width: 200,
              height: 50,
              backgroundColor: "white",
              marginTop: 5
            }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: 80, marginTop: 5 }}>Unlock Stealthy</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 20, color: 'grey', marginBottom: 80 }}>Session Locked By: {this.props.session}</Text>
        {activityIndicator}
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
          containerStyle={{ marginTop: 25 }}
        />
        <Button
          onPress={this._signOutAsync}
          title="Log Out"
          icon={{name: 'launch', color: 'white'}}
          buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#037aff'}}
          titleStyle={{ fontSize: 18, fontWeight: "bold"}}
          containerStyle={{ marginTop: 25 }}
        />
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  text: { fontWeight: 'bold', fontSize: 20 },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
  },
});

const mapStateToProps = (state) => {
  return {
    publicKey: EngineSelectors.getPublicKey(state),
    session: EngineSelectors.getSession(state),
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
