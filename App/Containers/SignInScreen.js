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
  NativeModules
} from 'react-native';
import { Icon, Button, Overlay, SocialIcon } from 'react-native-elements'

// import FAQ from '../Components/FAQ'

import laptop from '../Images/laptopChat.png';
import chatIcon from '../Images/blue512.png';
import chatV1 from '../Images/StealthyV1.png';
import flow from '../Images/rStealthyFlow.jpg';
import graphitePlugin from '../Images/plugin.jpg';

export default class SignInScreen extends React.Component {
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

  _signInAsync = async () => {
    // await AsyncStorage.setItem('userToken', 'abc');
    // this.props.navigation.navigate('App');
    const {BlockstackNativeModule} = NativeModules;
    await BlockstackNativeModule.signIn("https://www.stealthy.im/redirect.html", "https://www.stealthy.im", null, (error, events) => {
      if (!error) {
        this.props.navigation.navigate('App');
        let userData = this._getUserData();

        // TODO: call engine here with:
        //  userData[privateKey]
        //
        //  (other fields available right now are userData[username] and userData[profileURL],
        //   avatarUrl does not seem to be available--publicKey is but it's an array--one element,
        //   so probably safe to use).
        //
        // this.engine =
        //   new MessagingEngine(this.logger,
        //                       this.privateKey,
        //                       this.publicKey,
        //                       this.props.plugin,
        //                       this.props.avatarUrl,
        //                       this.props.path);
        //
        // Other stuff we'll need are encryptCies and decryptCies (from blockstack). Also,
        // the getPublicKeyFromPrivate method (unless we poach the array one above).
        //
      }
    });
  };

  _getUserData = () => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        throw(`Failed to get user data.  ${error}`);
      } else {
        console.log(`SUCCESS (getUserData):\n`);
        for (const key in userData) {
          console.log(`\t${key}: ${userData[key]}`)
        }

        // Get public key:
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], (error, publicKey) => {
            if (error) {
              throw(`Failed to get public key from private. ${error}`);
            } else {
              console.log(`SUCCESS (loadUserDataObject): publicKey = ${publicKey}\n`);

              // Test encryption
              // let testString = "Concensus";
              // BlockstackNativeModule.encryptPrivateKey(publicKey, testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptPrivateKey): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptPrivateKey(userData['privateKey'], cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptPrivateKey): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test encryptContent / decryptContent
              // let testString = "Content works?";
              // BlockstackNativeModule.encryptContent(testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt with encryptContent: ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptContent): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptContent(cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt with decryptContent: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptContent): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test get file on pk.txt path.
              // BlockstackNativeModule.getRawFile('pk.txt', (error, array) => {
              //   console.log('After getFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${array}`);
              //   console.log('');
              // });

              // Test write/read cycle:
              // BlockstackNativeModule.putFile('testWrite.txt',
              //                                'Will this work?',
              //                                (error, content) => {
              //   console.log('wrote testWrite.txt');
              //   console.log('After putFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${content}`);
              //   console.log('');
              //
              //   BlockstackNativeModule.getFile('testWrite.txt', (error, content) => {
              //     console.log('read testWrite.txt');
              //     console.log('After getFile:');
              //     console.log('--------------------------------------------------------');
              //     console.log(`error: ${error}`);
              //     console.log(`content: ${content}`);
              //     console.log('');
              //   });
              // });
            }
        });

        return userData;
      }
    });

    return undefined;
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
