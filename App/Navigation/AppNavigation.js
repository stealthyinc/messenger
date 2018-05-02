import React, { Component } from 'react'
import { NativeModules, ScrollView, Text, Image, View } from 'react-native'
import { StackNavigator, SwitchNavigator } from 'react-navigation';
import { Images } from '../Themes'

// Styles
import styles from './Styles/NavigationStyles'
import HomeScreen from '../Containers/HomeScreen'
import AuthLoadingScreen from '../Containers/AuthLoadingScreen'
import SignInScreen from '../Containers/SignInScreen'
import TabScreen from '../Containers/TabScreen'
import ChatScreen from '../Containers/ChatScreen'
import StartChatScreen from '../Containers/StartChatScreen'
import ContactScreen from '../Containers/ContactScreen'
import ChatMenuScreen from '../Containers/ChatMenuScreen'

console.disableYellowBox = true;

const AppStack = StackNavigator({
  Tab: { screen: TabScreen },
  ChatRoom: { screen: ChatScreen },
  ChatMenu: { screen: ChatMenuScreen },
});
const AuthStack = StackNavigator({ 
  SignIn: { screen: SignInScreen }
});

export default SwitchNavigator(
  {
    AuthLoading: AuthLoadingScreen,
    App: AppStack,
    Auth: AuthStack,
  },
  {
    headerMode: 'none',
    initialRouteName: 'AuthLoading',
    navigationOptions: {
      headerStyle: styles.header
    }
  }
);
