import assign from 'assign-deep';
import React, { Component } from 'react';
import {
  AppRegistry,
  Animated,
  Button,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View
} from 'react-native';

import Swiper from 'react-native-swiper';
import DoneButton from './AppIntro/DoneButton';
import SkipButton from './AppIntro/SkipButton';
import RenderDots from './AppIntro/Dots';
const utils = require('./../Engine/misc/utils.js');

const windowsWidth = Dimensions.get('window').width;
const windowsHeight = Dimensions.get('window').height;

const defaultStyles = {
  header: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pic: {
    width: 150,
    height: 150,
  },
  info: {
    flex: 0.5,
    alignItems: 'center',
    padding: 30,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
    padding: 15,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    paddingBottom: 20,
  },
  description: {
    color: '#fff',
    fontSize: 20,
  },
  controllText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  dotStyle: {
    backgroundColor: 'rgba(255,255,255,.3)',
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: 7,
    marginRight: 7,
    marginTop: 7,
    marginBottom: 7,
  },
  activeDotStyle: {
    backgroundColor: '#fff',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dotContainer: {
    flex: 0.6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContainer: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  nextButtonText: {
    fontSize: 25,
    fontWeight: 'bold',
    fontFamily: 'Arial',
  },
  full: {
    height: 80,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
}

const styles = StyleSheet.create({
  wrapper: {
  },
  slide1: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  slide2: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  slide3: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  slide4: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  slide5: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  slide6: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#34bbed',
  },
  text: {
    color: '#fff',
    fontSize: 36,
    marginTop: 20,
    fontWeight: 'bold',
    fontStyle: 'italic'
  }
})

import folder from '../Images/Icons/folder.png'
import dapp from '../Images/Icons/dapp.png'
import bitcoin from '../Images/Icons/bitcoin.png'
import blockchain from '../Images/Icons/blockchain.png'
import security from '../Images/Icons/molecular.png'
import censor from '../Images/Icons/chat.png'


export default class Introduction extends Component {
  static navigationOptions = {
    header: null,
  };
  constructor(props) {
    super(props);

    this.styles = StyleSheet.create(assign({}, defaultStyles, props.customStyles));
    this.state = {
      skipFadeOpacity: new Animated.Value(1),
      doneFadeOpacity: new Animated.Value(0),
      nextOpacity: new Animated.Value(1),
      parallax: new Animated.Value(0),
    };
  }
  setDoneBtnOpacity = (value) => {
    Animated.timing(
      this.state.doneFadeOpacity,
      { toValue: value },
    ).start();
  }

  setSkipBtnOpacity = (value) => {
    Animated.timing(
      this.state.skipFadeOpacity,
      { toValue: value },
    ).start();
  }

  setNextOpacity = (value) => {
    Animated.timing(
      this.state.nextOpacity,
      { toValue: value },
    ).start();
  }
  renderPagination = (index, total, context) => {
    let isDoneBtnShow;
    let isSkipBtnShow;
    if (index === total - 1) {
      this.setDoneBtnOpacity(1);
      this.setSkipBtnOpacity(0);
      this.setNextOpacity(0);
      isDoneBtnShow = true;
      isSkipBtnShow = false;
    } else {
      this.setDoneBtnOpacity(0);
      this.setSkipBtnOpacity(1);
      this.setNextOpacity(1);
      isDoneBtnShow = false;
      isSkipBtnShow = true;
    }
    return (
      <View style={[this.styles.paginationContainer]}>
        <SkipButton
          {...this.props}
          {...this.state}
          skipBtnLabel={'Skip'}
          leftTextColor={'#fff'}
          isSkipBtnShow={isSkipBtnShow}
          styles={this.styles}
          onSkipBtnClick={() => this.props.navigation.navigate('SignIn')}
        />
        {RenderDots(index, total, {
          ...this.props,
          styles: this.styles
        })}
        <DoneButton
          {...this.props}
          {...this.state}
          rightTextColor={'#fff'}
          nextBtnLabel={''}
          doneBtnLabel={'Done'}
          isDoneBtnShow={isDoneBtnShow}
          styles={this.styles}
          onDoneBtnClick={() => this.props.navigation.navigate('SignIn')}
        />
      </View>
    );
  }
  render(){
    const oldPad = utils.is_oldPad()
    const size = (oldPad) ? 100 : 150
    return (
      <Swiper 
        style={styles.wrapper} 
        showsButtons={false} 
        autoplay={true} 
        loop={false}
        renderPagination={this.renderPagination}>
        <View style={styles.slide5}>
          <Image source={dapp} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>DApp Integration</Text>
        </View>
        <View style={styles.slide6}>
          <Image source={bitcoin} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>Content Monetization</Text>
        </View>
        <View style={styles.slide1}>
          <Image source={folder} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>Distributed Storage</Text>
        </View>
        <View style={styles.slide2}>
          <Image source={blockchain} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>Blockchain Identity</Text>
        </View>
        <View style={styles.slide3}>
          <Image source={security} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>Decentralized Keys</Text>
        </View>
        <View style={styles.slide4}>
          <Image source={censor} style={{margin: size, width: size, height: size}} />
          <Text style={styles.text}>Censorship Free</Text>
        </View>
      </Swiper>
    );
  }
}