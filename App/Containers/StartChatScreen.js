import React, { Component } from 'react'
import { NativeModules, ScrollView, Text, Image, View } from 'react-native'
import { StackNavigator, SwitchNavigator } from 'react-navigation';

// Styles
import ChatMenuScreen from './ChatMenuScreen'
// import SignleChatScreen from './startChat/SignleChatScreen'
// import GroupChatScreen from './startChat/GroupChatScreen'
// import PublicChatScreen from './startChat/PublicChatScreen'
// import InviteScreen from './startChat/InviteScreen'

const StartChatStack = StackNavigator({
  ChatMenu: { screen: ChatMenuScreen },
  // SignleChat: { screen: SignleChatScreen },
  // GroupChat: { screen: GroupChatScreen },
  // PublicChat: { screen: PublicChatScreen },
  // Invite: { screen: InviteScreen }
});

export default SwitchNavigator(
  {
    Start: StartChatStack,
  },
  {
    headerMode: 'none',
    initialRouteName: 'Start',
    // navigationOptions: {
    //   headerStyle: styles.header
    // }
  }
);
