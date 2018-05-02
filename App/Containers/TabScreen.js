import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AsyncStorage, Image, View } from 'react-native';
import { Text, Card, Button } from 'react-native-elements'
import { TabNavigator, TabBarBottom } from 'react-navigation';
import ConversationScreen from './ConversationScreen'
import ContactScreen from './ContactScreen'
import ProfileScreen from './ProfileScreen'
class HomeScreen extends React.Component {
  static navigationOptions = {
    header: null,
  };
  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text h3>In Progress...</Text>
        <View />
        <Image
          style={{width: 300, height: 200}}
          source={{uri: 'https://m.popkey.co/00fb19/VeNqm.gif'}} />
      </View>
    );
  }
}

export default TabNavigator(
  {
    Chat: { screen: ConversationScreen },
    Wallet: { screen: HomeScreen },
    Profile: { screen: ProfileScreen },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarIcon: ({ focused, tintColor }) => {
        const { routeName } = navigation.state;
        let iconName;
        if (routeName === 'Chat') {
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