import React from 'react';
import {
  AsyncStorage,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  WebView,
  Linking,
  NativeModules,
  Platform,
} from 'react-native';
import { Icon, Button, Overlay, SocialIcon } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import Spinner from 'react-native-loading-spinner-overlay';

const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');
const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

// import FAQ from '../Components/FAQ'

import laptop from '../Images/laptopChat.png';
import chatIcon from '../Images/blue512.png';
import chatV1 from '../Images/StealthyV1.png';
import flow from '../Images/rStealthyFlow.jpg';
import graphitePlugin from '../Images/plugin.jpg';
import AwesomeAlert from 'react-native-awesome-alerts';

class SignInScreen extends React.Component {
  static navigationOptions = {
    header: null,
  };
  constructor(props) {
    super(props);
    this.state = {
      error: false,
      errorText: '',
    };
  }
  render() {
    const oldPad = utils.is_oldPad()
    const marginBottom = (oldPad) ? 50 : 80
    if (this.state.error) {
      return (
          <AwesomeAlert
            show={this.state.error}
            showProgress={false}
            title="Stealthy Error"
            message={this.state.errorText}
            closeOnTouchOutside={false}
            closeOnHardwareBackPress={false}
            showCancelButton={true}
            showConfirmButton={true}
            cancelText="Close"
            cancelButtonColor="#DD6B55"
            confirmText="More Info"
            confirmButtonColor="#34bbed"
            onCancelPressed={() => {
              this.setState({error: false, errorText: ''})
            }}
            onCancelPressed={() => {
              this.setState({error: false, errorText: ''})
            }}
            onConfirmPressed={() => Linking.openURL('https://www.stealthy.im/badIdError1.jpg').catch(err => console.error('An error occurred', err))}
          />
      )
    }
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
            onPress={this._signInAsync}
            title={(oldPad) ? "Login" : "Blockstack Login"}
            textStyle={{ fontSize: 18, fontWeight: "900", color: "#34bbed"}}
            icon={{name: 'input', color: "#34bbed"}}
            buttonStyle={{
              marginLeft: 20,
              width: (oldPad) ? 150 : 200,
              height: 50,
              backgroundColor: "white",
              borderColor: "#34bbed",
              borderWidth: 2,
              borderRadius: 5,
              marginTop: 5
            }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: (oldPad) ? 50 : 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: (oldPad) ? 50 : 80, marginTop: 5 }}>Hi Stealthy 👋</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: (oldPad) ? 20 : 24, color: 'grey', marginBottom }}>Decentralized Communication</Text>
        <Spinner visible={this.props.spinner} textContent={'Signing In...'} textStyle={{color: '#FFF'}} />
        <Button
          onPress={this._signInAsync}
          title="Create Account"
          textStyle={{ fontSize: 18, fontWeight: "900", color: "white"}}
          icon={{name: 'create', color: "white"}}
          buttonStyle={{
            backgroundColor: "#34bbed",
            width: 180,
            height: 50,
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 5,
            marginTop: (oldPad) ? 10 : 25
          }}
        />
        <Button
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=V9-egxTCFFE').catch(err => console.error('An error occurred', err))}
          title="Watch Demo"
          textStyle={{ fontSize: 18, fontWeight: "900", color: "black"}}
          icon={{name: 'featured-video', color: "black"}}
          buttonStyle={{
            backgroundColor: "white",
            width: 180,
            height: 50,
            borderColor: "black",
            borderWidth: 2,
            borderRadius: 5,
            marginTop: (oldPad) ? 10 : 25
          }}
        />
      </ScrollView>
    );
  }
  // iOS specific (possibly works on web too)
  _getUserData = async () => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        // throw(`Failed to get user data.  ${error}`);
        // this.props.setEngineFault(true)
        this.setState({error: true, errorText: 'User data not found. Please ensure you have a valid Blockstack username. E-mail support@stealthy.im for further help.'})
        this.props.setSignInPending(false)
      } else {
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], async (error, publicKey) => {
            if (error) {
              // throw(`Failed to get public key from private. ${error}`);
              // this.props.setEngineFault(true)
              this.setState({error: true, errorText: 'Failed to get public key from private.'})
              this.props.setSignInPending(false)
            }
            else {
              userData['appPublicKey'] = publicKey;
              AsyncStorage.setItem('userData', JSON.stringify(userData));
              this.props.screenProps.authWork(userData)
            }
        });
      }
    });
    return;
  };
  _getChannelsData = async () => {
    let channels = {}
    firebaseInstance.getFirebaseRef('/global/public_channel_v2_0/auto').once('value')
    .then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const name = childSnapshot.key
        const channel = childSnapshot.val()
        channels[name] = channel
      })
      AsyncStorage.setItem('channels', JSON.stringify(channels));
      this.props.setChannelsData(channels)
    })
  }
  _signInAsync = async () => {
    this.props.setSignInPending(true)
    const method = 'SignInScreen::_signInAsync'
    this._getChannelsData()
    const {BlockstackNativeModule} = NativeModules;
    const baseUrl = "https://www.stealthy.im"

    if (utils.isAndroid()) {
      // Need to populate userData as follows:
      // {
      //   username: <...>,
      //   profileURL: <...>,   TODO: AC
      //   privateKey: <...>,
      //   appPublicKey: <...>,
      // }
      let userData = {}

      try {
        // androidUserData {
        //   decentralizedID: <...>
        //   appPrivateKey: <...>
        // }
        const androidUserData = await BlockstackNativeModule.signIn()
        userData.privateKey = androidUserData.appPrivateKey
        userData.username = androidUserData.username
      } catch (error) {
        this.props.setSignInPending(false)
        throw utils.fmtErrorStr('Failed to sign in to Blockstack.', method, error)
      }

      try {
        const publicKey = await BlockstackNativeModule.getPublicKeyFromPrivateKey(userData.privateKey)
        userData.appPublicKey = publicKey
      } catch (error) {
        this.props.setSignInPending(false)
        throw utils.fmtErrorStr('Failed to get public key.', method, error)
      }

      AsyncStorage.setItem('userData', JSON.stringify(userData));
      this.props.screenProps.authWork(userData)
    } else if (utils.is_iOS()) {
      await BlockstackNativeModule.signIn(`${baseUrl}/redirect.html`, baseUrl, null, (error, events) => {
        if (!error) {
          this._getUserData()
        }
        else {
          this.props.setSignInPending(false)
        }
      });
    }
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
    spinner: EngineSelectors.getSignInPending(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setSignInPending: (flag) => dispatch(EngineActions.setSignInPending(flag)),
    setChannelsData: (channels) => dispatch(EngineActions.setChannelsData(channels))
    // setEngineFault: (flag) => dispatch(EngineActions.setEngineFault(flag)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SignInScreen)
