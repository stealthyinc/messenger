import React, { Component } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { 
  Container,
  List,
  ListItem,
  Left,
  Body,
  Right,
  Thumbnail,
  Text
} from 'native-base'

import LetterAvatar from './LetterAvatar'

export default class ControlPanel extends Component {
  render() {
    const items = [
      { name: 'Simon Mignolet', id: 'simon.id' },
      { name: 'Nathaniel Clyne', id: 'nathan.id' },
      { name: 'Dejan Lovren', id: 'dejan.id' },
      { name: 'Mama Sakho', id: 'mama.id' },
      { name: 'Emre Can', id: 'emre.id' },
    ];
    const { closeDrawer, addToInput } = this.props
    return (
      <View style={{flex: 1}}>
        <TouchableOpacity onPress={closeDrawer} style={{flex: 0.1}} />
        <Container style={{flex: 0.35}}>
          <ScrollView>
            <List dataArray={items}
              renderRow={(item) =>
                <ListItem avatar onPress={() => {
                  addToInput(`@${item.id}`)
                }}>
                  <Left>
                    <LetterAvatar username={item.id} />
                  </Left>
                  <Body>
                    <Text>{item.name}</Text>
                    <Text note>{item.id}</Text>
                  </Body>
                </ListItem>
              }>
            </List>
          </ScrollView>
        </Container>
        <TouchableOpacity onPress={closeDrawer} style={{flex: 0.55}} />
      </View>
    );
  }
}