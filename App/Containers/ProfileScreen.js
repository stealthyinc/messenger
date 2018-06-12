import React from 'react';
import { ActivityIndicator, AsyncStorage, Image, View, StyleSheet, TouchableOpacity, NativeModules, StatusBar } from 'react-native';
import { Avatar, Card, Button, Text, Icon } from 'react-native-elements'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import { Toast } from 'native-base';

const stock = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'

class ProfileScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold'}}>Profile</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        <TouchableOpacity onPress={() => params.goToSettings.navigate('Settings')} style={{marginRight: 10}}> 
          <Ionicons name="ios-settings-outline" size={30} color='#037aff'/>
        </TouchableOpacity>
      ),
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      showToast: false
    }
  }

  componentWillMount() {
    this.props.navigation.setParams({ goToSettings: this.props.navigation });
  }

  _signOutAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    await AsyncStorage.clear();
    await BlockstackNativeModule.signOut();
    this.props.navigation.navigate('Auth');
  };

  render() {
    const { userProfile, userData, userSettings } = this.props
    if (!userProfile) {
      return (
        <View style={styles.containerEmpty}>
          <ActivityIndicator />
          <StatusBar barStyle="default" />
        </View>
      );
    }
    const { discovery, notifications, heartbeat, webrtc } = userSettings
    console.log("User Settings", userSettings)
    const { profile } = userProfile
    const { username } = userData
    const { name, image } = profile
    let userImage = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
    if (image[0]) {
      userImage = image[0].contentUrl
    }
    return (
      <View style={styles.container}>
        <View style={{flex: 10}} />
        <View style={{flex: 60, alignItems: 'center'}}>
          <Avatar
            size="xlarge"
            rounded
            source={{uri: userImage}}
            onPress={() => console.log("Works!")}
            activeOpacity={0.7}
            containerStyle={{marginBottom: 15}}
          />
          <Text h4 style={{marginTop: 35, marginBottom: 15}}>{name}</Text>
          <Text style={{marginBottom: 15}}>{username}</Text>
          <View style={{flexDirection: 'row', margin: 30}}>
            <Icon
              reverse
              name='connectdevelop'
              type='font-awesome'
              color={(discovery) ? '#037aff' : 'grey'}
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
              color={(notifications) ? '#037aff' : 'grey'}
              onPress={() => {
                Toast.show({
                  text: (notifications) ? 'Notifications Setting Disabled!' : 'Notifications Setting Enabled!',
                  duration: 1500
                })
                this.props.updateUserSettings('notifications')}
              } />
            <Icon
              reverse
              name='heartbeat'
              type='font-awesome'
              color={(heartbeat) ? '#037aff' : 'grey'}
              onPress={() => {
                Toast.show({
                  text: (heartbeat) ? 'Heartbeat Setting Disabled!' : 'Heartbeat Setting Enabled!',
                  duration: 1500
                })
                this.props.updateUserSettings('heartbeat')}
              } />
            <Icon
              reverse
              name='wifi'
              type='font-awesome'
              color={(webrtc) ? '#037aff' : 'grey'}
              onPress={() => {
                Toast.show({
                  text: (webrtc) ? 'WebRTC Setting Disabled!' : 'WebRTC Setting Enabled!',
                  duration: 1500
                })
                this.props.updateUserSettings('webrtc')}
              } />
          </View>
          <Button
            onPress={this._signOutAsync}
            icon={{name: 'launch', color: 'white'}}
            buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#037aff'}}
            titleStyle={{ fontSize: 18, fontWeight: "bold"}}
            title='Log Out' 
          />
        </View>  
        <View style={{flex: 20}} />
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
    userData: EngineSelectors.getUserData(state),
    userSettings: EngineSelectors.getUserSettings(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (message) => dispatch(EngineActions.setOutgoingMessage(message)),
    updateUserSettings: (radio) => dispatch(EngineActions.updateUserSettings(radio)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfileScreen)