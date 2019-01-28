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
    key: 'DApp Integration',
    title: 'DApp Integration',
    text: 'Description.\nSay something cool',
    image: dapp,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#59b2ab'
  },
  {
    key: 'Content Monetization',
    title: 'Content Monetization',
    text: 'Other cool stuff',
    image: bitcoin,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#4F00BC'
  },
  {
    key: 'Distributed Storage',
    title: 'Distributed Storage',
    text: 'I\'m already out of descriptions\n\nLorem ipsum bla bla bla',
    image: folder,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#22bcb5'
  },
  {
    key: 'Blockchain Identity',
    title: 'Blockchain Identity',
    text: 'React-native-app-intro-slider is easy to setup with a small footprint and no dependencies. And it comes with good default layouts!',
    image: blockchain,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#63E2FF'
  },
  {
    key: 'Decentralized Keys',
    title: 'Decentralized Keys',
    text: 'The component is also super customizable, so you can adapt it to cover your needs and wants.',
    image: security,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#A3A1FF'
  },
  {
    key: 'Censorship Free',
    title: 'Censorship Free',
    text: 'Usage is all free',
    image: censor,
    imageStyle: styles.image,
    titleStyle: styles.title,
    textStyle: styles.text,
    backgroundColor: '#febe29'
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
