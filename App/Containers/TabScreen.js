import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TabNavigator, TabBarBottom } from 'react-navigation';
import ConversationScreen from './ConversationScreen'
import ContactProfile from './ContactProfile'
import ProfileScreen from './ProfileScreen'
// import WalletScreen from './WalletScreen'
import DiscoverScreen from './DiscoverScreen'
import DappStore from './DappStore'

export default TabNavigator(
  {
    // Discover: { screen: DiscoverScreen },
    Messages: { screen: ConversationScreen },
    // Wallet: { screen: WalletScreen },
    dApps: { screen: DappStore },
    Profile: { screen: ProfileScreen },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarIcon: ({ focused, tintColor }) => {
        const { routeName } = navigation.state;
        let iconName;
        if (routeName === 'Messages') {
          iconName = `ios-chatbubbles`;
        } 
        // else if (routeName === 'Wallet') {
        //   iconName = `ios-cash${focused ? '' : '-outline'}`;
        // }
        else if (routeName === 'Discover') {
          iconName = `ios-radio`;
        }
        else if (routeName === 'dApps') {
          iconName = `ios-aperture`;
        }
        else if (routeName === 'Profile') {
          iconName = `ios-contact`;
        }

        // You can return any component that you like here! We usually use an
        // icon component from react-native-vector-icons
        return <Ionicons name={iconName} size={28} color={tintColor} />;
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