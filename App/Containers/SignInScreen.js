import React from 'react';
import {
  AsyncStorage,
  StyleSheet,
  Text,
  View,
  Image,
  WebView,
  Linking,
} from 'react-native';
import { Icon, Button, SocialIcon } from 'react-native-elements'

import laptop from '../Images/laptopChat.png';
import chatIcon from '../Images/blue512.png';
import chatV1 from '../Images/StealthyV1.png';
import flow from '../Images/rStealthyFlow.jpg';
import graphitePlugin from '../Images/plugin.jpg';

export default class SignInScreen extends React.Component {
  static navigationOptions = {
    header: null,
  };

  render() {
    return (
      <View style={styles.container}>
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
            textStyle={{ fontSize: 16, fontWeight: "bold", color: "#34bbed"}}
            icon={{name: 'input', color: "#34bbed"}}
            buttonStyle={{
              width: 200,
              height: 50,
              backgroundColor: "white",
              borderColor: "#34bbed",
              borderWidth: 2,
              borderRadius: 5,
              marginTop: 5
            }}
            containerStyle={{ marginTop: 20 }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 30, marginLeft: 15, marginBottom: 80, marginTop: 5 }}>Say Hi to Stealthy</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 20, color: 'grey', marginBottom: 80 }}>Secure Decentralized Communication</Text>
        <Button
          onPress={this._signInAsync}
          title="Create Account"
          textStyle={{ fontSize: 16, fontWeight: "bold"}}
          icon={{name: 'create'}}
          buttonStyle={{
            backgroundColor: "#34bbed",
            width: 180,
            height: 50,
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 5,
          }}
          containerStyle={{ marginTop: 60 }}
        />
        <Button
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=wOfkTP8mgE4').catch(err => console.error('An error occurred', err))}
          title="Watch Demo"
          textStyle={{ fontSize: 16, fontWeight: "bold", color: "black"}}
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
      </View>
    );
  }

  _signInAsync = async () => {
    await AsyncStorage.setItem('userToken', 'abc');
    this.props.navigation.navigate('App');
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