import React from 'react';
import { AsyncStorage, Image, View, StyleSheet, TouchableOpacity, NativeModules } from 'react-native';
import { Avatar, Card, Button, Text } from 'react-native-elements'
import Ionicons from 'react-native-vector-icons/Ionicons';

export default class ProfileScreen extends React.Component {
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
    return (
      <View style={styles.container}>
        <View style={{flex: 20}} />
        <View style={{flex: 60, alignItems: 'center'}}>
          <Avatar
            size="xlarge"
            rounded
            source={{uri: "https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg"}}
            onPress={() => console.log("Works!")}
            activeOpacity={0.7}
            containerStyle={{marginBottom: 15}}
          />
          <Text h4 style={{marginTop: 35, marginBottom: 15}}>Ed Snowden</Text>
          <Text style={{marginBottom: 15}}>snowden.id</Text>
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