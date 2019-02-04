import React from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { TabNavigator, TabBarBottom } from 'react-navigation'
import ConversationScreen from './ConversationScreen'
import ProfileScreen from './ProfileScreen'

export default TabNavigator(
  {
    Messages: { screen: ConversationScreen },
    Profile: { screen: ProfileScreen }
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarIcon: ({ focused, tintColor }) => {
        const { routeName } = navigation.state
        let iconName
        if (routeName === 'Messages') {
          iconName = `ios-chatbubbles`
        }
        else if (routeName === 'Profile') {
          iconName = `ios-contact`
        }
        // You can return any component that you like here! We usually use an
        // icon component from react-native-vector-icons
        return <Ionicons name={iconName} size={30} color={tintColor} />
      }
    }),
    tabBarOptions: {
      activeTintColor: '#34bbed',
      inactiveTintColor: 'gray'
    },
    tabBarComponent: TabBarBottom,
    tabBarPosition: 'bottom',
    animationEnabled: false,
    swipeEnabled: false
  }
)
