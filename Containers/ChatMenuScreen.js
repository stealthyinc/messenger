import React from 'react';
import { AsyncStorage, Button, View, ListView, StyleSheet, Text, TouchableHighlight } from 'react-native';
import TouchableRow from './contacts/Row';
import { ListItem } from 'react-native-elements'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  separator: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#8E8E8E',
  },
});

const list = [
  {
    title: 'New Chat',
    icon: 'message'
  },
  {
    title: 'New Group Chat',
    icon: 'group'
  },
  {
    title: 'New Public Chat',
    icon: 'public'
  },
  {
    title: 'Invite Friends',
    icon: 'person-add'
  },
]

class ChatMenuScreen extends React.Component {

  static navigationOptions = {
    headerTitle: "Say Hello",
  };

  render() {
    return (
      <View>
        {
          list.map((item, i) => (
            <ListItem
              key={i}
              title={item.title}
              leftIcon={{ name: item.icon }}
            />
          ))
        }
      </View>
    );
  }
}

export default ChatMenuScreen;