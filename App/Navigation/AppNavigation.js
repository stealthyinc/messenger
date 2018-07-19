import React, { Component } from 'react'
import { NativeModules, ScrollView, Text, Image, View } from 'react-native'
import { DrawerNavigator, StackNavigator, SwitchNavigator } from 'react-navigation';
import { Images } from '../Themes'

// Styles
import styles from './Styles/NavigationStyles'
import AuthLoadingScreen from '../Containers/AuthLoadingScreen'
import SignInScreen from '../Containers/SignInScreen'
import TabScreen from '../Containers/TabScreen'
import BlockScreen from '../Containers/BlockScreen'
import ChatScreen from '../Containers/ChatScreen'
import StartChatScreen from '../Containers/StartChatScreen'
import ContactScreen from '../Containers/ContactScreen'
import ChatMenuScreen from '../Containers/ChatMenuScreen'
import ContactProfile from '../Containers/ContactProfile'
import BlockContactSearch from '../Containers/BlockContactSearch'
import Introduction from '../Components/Introduction'

console.disableYellowBox = true;

const ChatRoom = DrawerNavigator(
  {
    ChatRoom: { screen: ChatScreen },
  },
  {
    contentComponent: props => <ContactProfile {...props} />,
    drawerPosition: 'right'
  }
);

const PrimaryNav = StackNavigator({
  Tab: { screen: TabScreen },
  ChatRoom,
  BlockContactSearch: { screen: BlockContactSearch },
  ChatMenu: { screen: ChatMenuScreen },
});

const AuthStack = StackNavigator({
  Intro: { screen: Introduction },
  SignIn: { screen: SignInScreen }
});

export default SwitchNavigator(
  {
    AuthLoading: AuthLoadingScreen,
    App: PrimaryNav,
    Auth: AuthStack,
    Block: BlockScreen,
  },
  {
    headerMode: 'none',
    initialRouteName: 'AuthLoading',
    navigationOptions: {
      headerStyle: styles.header
    }
  }
);
