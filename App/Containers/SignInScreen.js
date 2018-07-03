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
const { MessagingEngine } = require('../Engine/engine.js');
import firebase from 'react-native-firebase';

const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');

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
            titleStyle={{ fontSize: 16, fontWeight: "bold", color: "#34bbed"}}
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
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: 80, marginTop: 5 }}>Say Hi to Stealthy</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 20, color: 'grey', marginBottom: 80 }}>Secure Decentralized Communication</Text>
        <Button
          onPress={this._signInAsync}
          title="Create Account"
          titleStyle={{ fontSize: 16, fontWeight: "bold", color: "white"}}
          icon={{name: 'create', color: "white"}}
          buttonStyle={{
            backgroundColor: "#34bbed",
            width: 180,
            height: 50,
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 5,
          }}
          containerStyle={{ marginTop: 25 }}
        />
        <Button
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=wOfkTP8mgE4').catch(err => console.error('An error occurred', err))}
          title="Watch Demo"
          titleStyle={{ fontSize: 16, fontWeight: "bold", color: "black"}}
          icon={{name: 'featured-video', color: "black"}}
          buttonStyle={{
            backgroundColor: "white",
            width: 180,
            height: 50,
            borderColor: "black",
            borderWidth: 2,
            borderRadius: 5,
          }}
          style={{ marginTop: 25 }}
        />
        {/*<Button
          onPress={() => this.setState({isVisible: !this.state.isVisible})}
          title="Frequent Q's"
          titleStyle={{ fontSize: 16, fontWeight: "bold", color: "#34bbed"}}
          icon={{name: 'info-outline', color: "#34bbed"}}
          buttonStyle={{
            backgroundColor: "black",
            width: 180,
            height: 50,
            borderColor: "#34bbed",
            borderWidth: 2,
            borderRadius: 5,
          }}
          style={{ marginTop: 25, marginBottom: 50 }}
        />
        <Overlay
          isVisible={this.state.isVisible}
          onBackdropPress={() => this.setState({isVisible: !this.state.isVisible})}
          width="auto"
          height="auto"
        >
          <FAQ />
        </Overlay>*/}
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
              this.props.setPublicKey(publicKey)
              this.userData = userData;

              AsyncStorage.setItem('userData', JSON.stringify(this.userData));
              const ref = firebase.database().ref(common.getSessionRef(publicKey));
              await ref.once('value')
              .then((snapshot) => {
                if (!snapshot.exists() || snapshot.val() === 'none') {
                  ref.set(common.getSessionId());
                  this.props.setUserData(this.userData)
                  this.props.navigation.navigate('App');
                }
                else {
                  this.props.navigation.navigate('Block');
                }
              })
              // completion();
            }
        });
      }
    });
    return;
  };
  _signInAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    await BlockstackNativeModule.signIn("https://www.stealthy.im/redirect.html", "https://www.stealthy.im", null, (error, events) => {
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
    setUserData: (userData) => dispatch(EngineActions.setUserData(userData)),
    setPublicKey: (publicKey) => dispatch(EngineActions.setPublicKey(publicKey)),
  }
}

export default connect(null, mapDispatchToProps)(SignInScreen)
