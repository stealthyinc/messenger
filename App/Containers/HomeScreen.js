import React, { Component } from 'react'
import { AsyncStorage, Button, StyleSheet, View } from 'react-native'

export default class HomeScreen extends React.Component {

  render() {
    return (
      <View style={styles.container}>
        <Button title="Start Chatting" onPress={this._showMoreApp} />
        <Button title="Actually, sign me out :)" onPress={this._signOutAsync} />
      </View>
    );
  }

  _showMoreApp = () => {
    this.props.navigation.navigate('Tab');
  };

  _signOutAsync = async () => {
    await AsyncStorage.clear();
    this.props.navigation.navigate('Auth');
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});