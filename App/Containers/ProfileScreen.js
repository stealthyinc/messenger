import React from 'react';
import { ActivityIndicator, AsyncStorage, Image, View, StyleSheet, TouchableOpacity, NativeModules, StatusBar } from 'react-native';
import { Avatar, Card, Button, Text } from 'react-native-elements'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const stock = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'

class ProfileScreen extends React.Component {
  static navigationOptions = {
    headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold'}}>Profile</Text>,
    headerRight: (
      <TouchableOpacity onPress={() => alert('Profile Info')} style={{marginRight: 10}}> 
        <Ionicons name="ios-settings-outline" size={30} color='#037aff'/>
      </TouchableOpacity>
    ),
  };

  _signOutAsync = async () => {
    const {BlockstackNativeModule} = NativeModules;
    await AsyncStorage.clear();
    await BlockstackNativeModule.signOut();
    this.props.navigation.navigate('Auth');
  };

  render() {
    const { userProfile, userData } = this.props
    if (!userProfile) {
      return (
        <View style={styles.container}>
          <ActivityIndicator />
          <StatusBar barStyle="default" />
        </View>
      );
    }
    const { profile } = userProfile
    const { username } = userData
    const { name, image } = profile
    let userImage = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
    if (image[0]) {
      userImage = image[0].contentUrl
    }
    return (
      <View style={styles.container}>
        <View style={{flex: 20}} />
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
          <Button
            onPress={this._signOutAsync}
            icon={{name: 'launch', color: 'white'}}
            backgroundColor='#03A9F4'
            buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50,}}
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
});

const mapStateToProps = (state) => {
  return {
    userProfile: EngineSelectors.getUserProfile(state),
    userData: EngineSelectors.getUserData(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (message) => dispatch(EngineActions.setOutgoingMessage(message)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfileScreen)