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

const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');
const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

// import FAQ from '../Components/FAQ'

import laptop from '../Images/laptopChat.png';
import chatIcon from '../Images/blue512.png';
import chatV1 from '../Images/StealthyV1.png';
import flow from '../Images/rStealthyFlow.jpg';
import graphitePlugin from '../Images/plugin.jpg';

class SignInScreen extends React.Component {

  static navigationOptions = {
    header: null,
  };

  state = {
    isVisible: false
  }

  render() {
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
            title="Blockstack Login"
            textStyle={{ fontSize: 18, fontWeight: "900", color: "#34bbed"}}
            icon={{name: 'input', color: "#34bbed"}}
            buttonStyle={{
              marginLeft: 20,
              width: 200,
              height: 50,
              backgroundColor: "white",
              borderColor: "#34bbed",
              borderWidth: 2,
              borderRadius: 5,
              marginTop: 5
            }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: 80, marginTop: 5 }}>Hi Stealthy 👋</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 24, color: 'grey', marginBottom: 80 }}>dApp Communication Protocol</Text>
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
            marginTop: 25
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
            marginTop: 25
          }}
        />
      </ScrollView>
    );
  }
  _getUserData = async (completion) => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        throw(`Failed to get user data.  ${error}`);
      } else {
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], async (error, publicKey) => {
            if (error) {
              throw(`Failed to get public key from private. ${error}`);
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
  _signInAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    const baseUrl = "https://www.stealthy.im"
    await BlockstackNativeModule.signIn(`${baseUrl}/redirect.html`, baseUrl, null, (error, events) => {
      if (!error) {
        this._getUserData()
      }
    });
  };
}

const styles = StyleSheet.create({
  text: { fontWeight: 'bold', fontSize: 20 },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
  },
});

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(null, mapDispatchToProps)(SignInScreen)
