import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-elements'
import { Container, Content, List, ListItem, Icon, Left, Body, Right, Subtitle, Title } from 'native-base'
import Ionicons from 'react-native-vector-icons/Ionicons'

export default class WalletScreen extends React.Component {
  static navigationOptions = {
    headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold'}}>Wallet</Text>,
    headerRight: (
      <TouchableOpacity onPress={() => alert('Wallet Info')} style={{marginRight: 10}}>
        <Ionicons name='ios-help-circle-outline' size={30} color='#34bbed' />
      </TouchableOpacity>
    )
  };
  render () {
    return (
      <View style={{flex: 1}}>
        <View style={{flex: 0.50, borderRadius: 5, backgroundColor: '#34bbed'}}>
          <View style={{flex: 0.7}}>
            <View style={{flex: 0.4}} />
            <View style={{flex: 0.6, alignItems: 'center'}}>
              <Title style={{fontSize: 32, color: 'white'}}>$0 USD</Title>
              <Subtitle style={{fontSize: 16}}>Total Value</Subtitle>
            </View>
          </View>
          <Container>
            <Content>
              <List>
                <ListItem icon>
                  <Left>
                    <Icon name='arrow-forward' style={{color: 'white', marginLeft: 7}} />
                  </Left>
                  <Body>
                    <Text style={{color: 'white'}}>Send Transaction</Text>
                  </Body>
                  <Right>
                    <Icon name='arrow-forward' style={{color: 'white'}} />
                  </Right>
                </ListItem>
                <ListItem icon>
                  <Left>
                    <Icon name='arrow-back' style={{color: 'white', marginLeft: 7}} />
                  </Left>
                  <Body>
                    <Text style={{color: 'white'}}>Receive Transaction</Text>
                  </Body>
                  <Right>
                    <Icon name='arrow-forward' style={{color: 'white'}} />
                  </Right>
                </ListItem>
                <ListItem icon>
                  <Left>
                    <Icon name='md-code' style={{color: 'white'}} />
                  </Left>
                  <Body>
                    <Text style={{color: 'white'}}>Past Transactions</Text>
                  </Body>
                  <Right>
                    <Icon name='arrow-forward' style={{color: 'white'}} />
                  </Right>
                </ListItem>
              </List>
            </Content>
          </Container>
        </View>
        <View style={{flex: 0.50, borderRadius: 5, backgroundColor: 'white'}}>
          <Title style={{fontSize: 24, marginLeft: 10, marginTop: 10, textAlign: 'left'}}>Assets</Title>
          <View style={{flex: 0.2, backgroundColor: 'white'}} />
          <Container>
            <Content>
              <List>
                <ListItem icon>
                  <Left>
                    <Icon name='logo-bitcoin' />
                  </Left>
                  <Body>
                    <Text>2 BTC</Text>
                  </Body>
                </ListItem>
                <ListItem icon>
                  <Left>
                    <Icon name='logo-usd' />
                  </Left>
                  <Body>
                    <Text>23,000</Text>
                  </Body>
                </ListItem>
              </List>
            </Content>
          </Container>
        </View>
      </View>
    )
  }
}
