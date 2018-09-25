import React from 'react';
import { ActivityIndicator, AsyncStorage, Image, View, StyleSheet, TouchableOpacity, NativeModules, StatusBar } from 'react-native';
import { Avatar, Card, Button, Text, Icon, Overlay } from 'react-native-elements'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import { Toast } from 'native-base';
import { shareOnTwitter } from 'react-native-social-share';
import Communications from 'react-native-communications';
import ActionSheet from 'react-native-actionsheet'

const utils = require('./../Engine/misc/utils.js');

const common = require('./../common.js');

const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

import defaultProfile from '../Images/defaultProfile.png'
import chatIcon from '../Images/blue512.png';

class ProfileScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Profile</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        <TouchableOpacity onPress={() => params.showOverlay()} style={{marginRight: 10}}>
          <Ionicons name="ios-information-circle" size={30} color='white'/>
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      showToast: false,
      isVisible: false
    }
  }

  componentWillMount() {
    this.props.navigation.setParams({ showOverlay: this.showOverlay });
  }

  showOverlay = () => {
    this.setState({isVisible: !this.state.isVisible})
  }
  showActionSheet = () => {
    this.ActionSheet.show()
  }
  render() {
    console.log('ProfileScreen render')
    const { userProfile, userData, userSettings } = this.props
    if (!userProfile) {
      return (
        <View style={styles.containerEmpty}>
          <ActivityIndicator size="large" color="#34bbed"/>
          <StatusBar barStyle="default" />
        </View>
      );
    }
    const { discovery, notifications, heartbeat, webrtc, analytics } = userSettings
    const { profile, base64 } = userProfile
    const { username } = userData
    const { name, image } = profile
    const fullName = (name) ? name : null
    const userImage = (image && image[0] && image[0].contentUrl) ?
      image[0].contentUrl : undefined
    const shareText = 'You can securely message me at: ' + username + ' on @stealthyim! #decentralize #takebackcontrol #controlyourdata https://www.stealthy.im'
    const shareText1 = 'Come chat with me on Stealthy.IM! Add me: ' + username
    const oldPad = utils.is_oldPad()
    const margin = (oldPad) ? 20 : 30
    const marginBottom = (oldPad) ? 5 : 15
    const flex = (oldPad) ? 5 : 10
    const avatarSize = (oldPad) ? (
      <Avatar
        large
        rounded
        source={{uri: base64}}
        onPress={() => console.log("Works!")}
        activeOpacity={(userImage) ? 0.7 : 0.5}
        containerStyle={{marginBottom: 15}}
      />
    ) : (
      <Avatar
        xlarge
        rounded
        source={{uri: base64}}
        onPress={() => console.log("Works!")}
        activeOpacity={(userImage) ? 0.7 : 0.5}
        containerStyle={{marginBottom: 15}}
      />
    )
    return (
      <View style={styles.container}>
        <View style={{flex: flex}} />
        <View style={{flex: 60, alignItems: 'center'}}>
          {avatarSize}
          <Text h4 style={{marginTop: 15, marginBottom: marginBottom}}>{fullName}</Text>
          <Text h4 style={{marginBottom: marginBottom, fontWeight: 'bold'}}>({username})</Text>
          <View style={{flexDirection: 'row', margin: margin}}>
            <Icon
              reverse
              name='connectdevelop'
              type='font-awesome'
              color={(discovery) ? '#34bbed' : 'grey'}
              onPress={() => {
                Toast.show({
                  text: (discovery) ? 'Discovery Setting Disabled!' : 'Discovery Setting Enabled!',
                  duration: 1500
                })
                this.props.updateUserSettings('discovery')}
              } />
            <Icon
              reverse
              name='bell'
              type='font-awesome'
              color={(notifications) ? '#34bbed' : 'grey'}
              onPress={() => {
                Toast.show({
                  text: (notifications) ? 'Notifications Setting Disabled!' : 'Notifications Setting Enabled!',
                  duration: 1500
                })
                this.props.updateUserSettings('notifications')}
              } />
              <Icon
                reverse
                name='pie-chart'
                type='font-awesome'
                color={(analytics) ? '#34bbed' : 'grey'}
                onPress={() => {
                  Toast.show({
                    text: (analytics) ? 'Analytics Setting Disabled!' : 'Analytics Setting Enabled!',
                    duration: 1500
                  })
                  this.props.updateUserSettings('analytics')}
                } />
              {/*<Icon
                reverse
                name='twitter'
                type='font-awesome'
                color='#34bbed'
                onPress={() => 
                  shareOnTwitter({
                    'text': shareText,
                  },
                  (results) => {
                    console.log(results);
                  }
              )} />*/}
          </View>
          <Button
            onPress={this.showActionSheet}
            icon={{name: 'share', color: 'white'}}
            buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 15, width: 180, height: 50, backgroundColor: '#34bbed'}}
            textStyle={{ fontSize: 18, fontWeight: "900", color: "white"}}
            title='Share On'
          />
          <Button
            onPress={this.props.screenProps.logout}
            icon={{name: 'launch', color: 'white'}}
            buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#34bbed'}}
            textStyle={{ fontSize: 18, fontWeight: "900", color: "white"}}
            title='Log Out'
          />
        </View>
        <View style={{flex: 20}} />
        <ActionSheet
          ref={o => this.ActionSheet = o}
          title={'Sharing Options'}
          options={['Tweet your ID', 'Invite via SMS', 'Email Contacts', 'Cancel']}
          cancelButtonIndex={3}
          destructiveButtonIndex={3}
          onPress={(index) => { 
            if (index === 0) {
              shareOnTwitter({
                    'text': shareText,
                  },
                  (results) => {
                    console.log(results);
                  }
              )
            }
            else if (index === 1) {
              Communications.textWithoutEncoding(null, `Add me on Stealthy IM: ${username}. Download Stealthy here: http://onelink.to/5krfsk`)
            }
            else if (index === 2) {
              Communications.email([''],null,null,`Add me on Stealthy IM: ${username}`,'Download Stealthy here: http://onelink.to/5krfsk')
            }
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  containerEmpty: {
    flex: 1,
    paddingTop: 100,
    backgroundColor: 'white',
    alignItems: 'center',
  }
});

const mapStateToProps = (state) => {
  return {
    userProfile: EngineSelectors.getUserProfile(state),
    publicKey: EngineSelectors.getPublicKey(state),
    userData: EngineSelectors.getUserData(state),
    userSettings: EngineSelectors.getUserSettings(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateUserSettings: (radio) => dispatch(EngineActions.updateUserSettings(radio)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfileScreen)
