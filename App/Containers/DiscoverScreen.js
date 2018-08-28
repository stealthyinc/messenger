import React, { Component } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Text, Divider } from 'react-native-elements'
import { Container, Header, Content, List, ListItem, Thumbnail, Left, Body, Right, Button } from 'native-base';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

// Styles
import styles from './Styles/DiscoverScreenStyle'

class DiscoverScreen extends Component {
  static navigationOptions = {
    headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Discover</Text>,
    headerRight: (
      <TouchableOpacity onPress={() => console.log('Discover Info')} style={{marginRight: 10}}> 
        <Ionicons name="ios-help-buoy" size={30} color='white'/>
      </TouchableOpacity>
    ),
    headerTintColor: 'white',
    headerStyle: {
      backgroundColor: '#34bbed'
    }
  };
  render () {
    return (
      <Container>
        <Content>
          <List>
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://www.stealthy.im/blue512.png' }} />
              </Left>
              <Body>
                <Text>Stealthy</Text>
                <Text note numberOfLines={1}>Learn more about Stealthy IM</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://storage.googleapis.com/proudcity/wwwproudcity/uploads/2016/10/techcrunch.jpg' }} />
              </Left>
              <Body>
                <Text>TC Disrupt</Text>
                <Text note numberOfLines={1}>Meet fellow TC Disrupt attendees</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://www.connecterra.io/wp-content/uploads/2018/01/blockchain.png' }} />
              </Left>
              <Body>
                <Text>Blockchain</Text>
                <Text note numberOfLines={1}>Discuss topics about the MotherChain</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://cdn-images-1.medium.com/max/1200/1*rxtmOdJAm4q4QcEPT-3m-g.jpeg' }} />
              </Left>
              <Body>
                <Text>Tokenomics</Text>
                <Text note numberOfLines={1}>How are the incentives aligned?</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://techcrunch.com/wp-content/uploads/2017/09/gettyimages-639050350.jpg' }} />
              </Left>
              <Body>
                <Text>Decentralization</Text>
                <Text note numberOfLines={1}>Understand the pros and cons</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://cdn.geekwire.com/wp-content/uploads/2016/07/GraphDB-FA-big-hero.png' }} />
              </Left>
              <Body>
                <Text>Protocols vs. DApps</Text>
                <Text note numberOfLines={1}>Who gets the cheese?</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://pbs.twimg.com/profile_images/837047342863888384/FjKeM4Aa_400x400.jpg' }} />
              </Left>
              <Body>
                <Text>Blockstack</Text>
                <Text note numberOfLines={1}>Better off chain vs on chain</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
            <ListItem thumbnail>
              <Left>
                <Thumbnail square source={{ uri: 'https://cdn-images-1.medium.com/max/1600/1*t_G1kZwKv0p2arQCgYG7IQ.gif' }} />
              </Left>
              <Body>
                <Text>Random</Text>
                <Text note numberOfLines={1}>Random topics</Text>
              </Body>
              <Right>
                <Button transparent>
                  <Ionicons name="ios-log-in" size={30} color='#34bbed'/>
                </Button>
              </Right>
            </ListItem>
            <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
          </List>
        </Content>
      </Container>
    );
  }
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DiscoverScreen)
