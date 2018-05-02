import React from 'react';
import { AsyncStorage, Image, View, StyleSheet } from 'react-native';
import { Avatar, Card, Button, Text } from 'react-native-elements'

export default class ProfileScreen extends React.Component {
  static navigationOptions = {
    header: null,
  };

  _signOutAsync = async () => {
    await AsyncStorage.clear();
    this.props.navigation.navigate('Auth');
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={{flex: 20}} />
        <View style={{flex: 60, alignItems: 'center'}}>
          <Avatar
            xlarge
            rounded
            source={{uri: "https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg"}}
            onPress={() => console.log("Works!")}
            activeOpacity={0.7}
            style={{marginBottom: 15}}
          />
          <Text h4 style={{marginTop: 15, marginBottom: 15}}>Ed Snowden</Text>
          <Text style={{marginBottom: 15}}>snowden.id</Text>
          <Button
            onPress={this._signOutAsync}
            icon={{name: 'launch'}}
            backgroundColor='#03A9F4'
            buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0}}
            textStyle={{ fontSize: 16, fontWeight: "bold"}}
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