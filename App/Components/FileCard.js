import React, { Component } from 'react';
import { Image } from 'react-native';
import { Container, Header, Content, Card, CardItem, Thumbnail, Text, Button, Icon, Left, Right, Body } from 'native-base';
export default class CardShowcaseExample extends Component {
  renderCardItems = () => {
    let cards = []
    const {simulatedData} = this.props
    console.log('simulatedData', simulatedData)
    for (const item in simulatedData) {
      const {title, author, fileUrl, profile} = simulatedData[item]
      cards.push(
        <CardItem style={{backgroundColor: '#f7f5eee8'}} key={item} onPress={(fileUrl) => console.log('fileUrl', fileUrl)}>
          <Image style={{width: 30, height: 30, marginRight: 10}} source={{uri: 'https://gaia.blockstack.org/hub/16KyUebBPPXgQLvA1f51bpsne3gL7Emdrc/0/avatar-0'}} />
          <Text>{title}</Text>
          <Right>
            <Icon name="arrow-forward" />
          </Right>
        </CardItem>
      )
    }
    return cards
  }
  render() {
    return (
      <Content style={{marginTop: 20}}>
        <Card style={{backgroundColor: '#f7f5eee8'}}>
          {this.renderCardItems()}
         </Card>
      </Content>
    );
  }
}