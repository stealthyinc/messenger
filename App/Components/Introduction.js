import assign from 'assign-deep'
import React, { Component } from 'react'
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View
} from 'react-native'

import AppIntroSlider from 'react-native-app-intro-slider';
import Ionicons from 'react-native-vector-icons/Ionicons'

import dapp from '../Images/Icons/dapp.png'
import bitcoin from '../Images/Icons/bitcoin.png'
import folder from '../Images/Icons/folder.png'
import blockchain from '../Images/Icons/blockchain.png'
import security from '../Images/Icons/molecular.png'
import censor from '../Images/Icons/chat.png'

const utils = require('./../Engine/misc/utils.js')

const styles = StyleSheet.create({
  buttonCircle: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, .2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold'
  }
});

const slides = [
  {
    key: 'Blockchain Identity',
    title: 'Blockchain Identity',
    text: 'Your identity is written to the blockchain',
    image: blockchain,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#29ABE2'
  },
  {
    key: 'Distributed Storage',
    title: 'Distributed Storage',
    text: 'Your data is stored in your personal cloud drive',
    image: folder,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#22bcb5'
  },
  {
    key: 'Decentralized Keys',
    title: 'Decentralized Keys',
    text: 'Only you have access to your encyrption keys',
    image: security,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#A3A1FF'
  },
  {
    key: 'Censorship Free',
    title: 'Censorship Free',
    text: 'Nobody can interfere or prohibit your speech',
    image: censor,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#ffc62b'
  },
];

export default class Introduction extends Component {
  static navigationOptions = {
    header: null
  };
  constructor (props) {
    super(props)
  }
  _renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons
          name="md-arrow-round-forward"
          color="rgba(255, 255, 255, .9)"
          size={24}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    );
  }
  _renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons
          name="md-checkmark"
          color="rgba(255, 255, 255, .9)"
          size={24}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    );
  }
  render () {
    return (
      <AppIntroSlider 
        slides={slides}
        renderDoneButton={this._renderDoneButton}
        renderNextButton={this._renderNextButton}
        onDone={() => this.props.navigation.navigate('SignIn')}
      />
    )
  }
}
