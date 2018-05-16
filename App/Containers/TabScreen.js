import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AsyncStorage, Image, View } from 'react-native';
import { Text, Card, Button } from 'react-native-elements'
import { TabNavigator, TabBarBottom } from 'react-navigation';
import ConversationScreen from './ConversationScreen'
import ContactScreen from './ContactScreen'
import ProfileScreen from './ProfileScreen'
import WalletScreen from './WalletScreen'

export default TabNavigator(
  {
    Messages: { screen: ConversationScreen },
    // Wallet: { screen: WalletScreen },
    Profile: { screen: ProfileScreen },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarIcon: ({ focused, tintColor }) => {
        const { routeName } = navigation.state;
        let iconName;
        if (routeName === 'Messages') {
          iconName = `ios-chatbubbles${focused ? '' : '-outline'}`;
        } 
        else if (routeName === 'Wallet') {
          iconName = `ios-cash${focused ? '' : '-outline'}`;
        }
        else if (routeName === 'Profile') {
          iconName = `ios-contact${focused ? '' : '-outline'}`;
        }

        // You can return any component that you like here! We usually use an
        // icon component from react-native-vector-icons
        return <Ionicons name={iconName} size={25} color={tintColor} />;
      },
    }),
    tabBarOptions: {
      activeTintColor: '#34bbed',
      inactiveTintColor: 'gray',
    },
    tabBarComponent: TabBarBottom,
    tabBarPosition: 'bottom',
    animationEnabled: false,
    swipeEnabled: false,
  }
);