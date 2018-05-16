import React from 'react';
import { AsyncStorage, View, ListView, StyleSheet, TouchableOpacity } from 'react-native';
import TouchableRow from './contacts/Row';
// import Header from './contacts/Header';
import Footer from './contacts/Footer';
import SectionHeader from './contacts/SectionHeader';
import { SearchBar, Text } from 'react-native-elements'
import { Button, Container, Header, Content, List, ListItem, Left, Body, Right, Item, Icon, Input, Thumbnail, Title } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firebase from 'react-native-firebase';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  separator: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#8E8E8E',
  },
});
const stock = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
const list = [
  // {
  //   name: 'New Contact',
  //   picture: stock,
  //   text: 'Start a new conversation',
  //   time: 'Now'
  // },
  {
    name: 'Daniel Alvarez',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Albert Bjorn',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/matt.jpg',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Mathew Leinart',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/matthew.png',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Elliot Baker',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/elliot.jpg',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Steve Sanders',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/steve.jpg',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Molly Thomas',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/molly.png',
    text: "hello",
    time: "12:59 pm",
  },
  {
    name: 'Jenny Davis',
    picture: 'https://react.semantic-ui.com/assets/images/avatar/large/jenny.jpg',
    text: "hello",
    time: "12:59 pm",
  },
]

class ConversationScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold'}}>Messages</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        //params.goToChatRoom.navigate('BlockContactSearch')
        <TouchableOpacity onPress={() => params.sendMessage()} style={{marginRight: 10}}> 
          <Ionicons name="ios-paper-plane-outline" size={30} color='#037aff'/>
        </TouchableOpacity>
      ),
    };
  };
  constructor(props) {
    super(props);
    this.ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.state = {
      basic: true,
      listViewData: list,
    };
  }
  componentWillMount() {
    this.props.navigation.setParams({ goToChatRoom: this.props.navigation, sendMessage: this.sendTestMessageToFirebase });
  }
  sendTestMessageToFirebase() {
    //pbj pk.txt: 0231debdb29c8761a215619b2679991a1db8006c953d1fa554de32e700fe89feb9
    //ayc pk.txt: 0363cd66f87eec2e0fc2a4bc9b8314f5fd0c2a18ce1c6a7d31f1efec83253d46a2
    const senderId  = "alexc.id"
    const time      = Date.now()
    const read      = false
    const sender    = "0363cd66f87eec2e0fc2a4bc9b8314f5fd0c2a18ce1c6a7d31f1efec83253d46a2"
    const recepient = "0231debdb29c8761a215619b2679991a1db8006c953d1fa554de32e700fe89feb9"
    const npath = `/global/notifications/${recepient}/`
    firebase.database().ref(npath).push({
      read,
      time,
      sender,
      senderId,
    })
  }
  deleteRow(secId, rowId, rowMap) {
    rowMap[`${secId}${rowId}`].props.closeRow();
    const newData = [...this.state.listViewData];
    newData.splice(rowId, 1);
    this.setState({ listViewData: newData });
  }
  render() {
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    return (
      <Container style={{backgroundColor: 'white'}}>
        <Content>
          <List
            dataSource={this.ds.cloneWithRows(this.state.listViewData)}
            renderRow={item =>
              <ListItem style={{marginLeft: 5}} avatar onPress={()=>this.props.navigation.navigate('ChatRoom')}>
                <Left>
                  <Thumbnail source={{ uri: item.picture}} />
                </Left>
                <Body>
                  <Text>{item.name}</Text>
                  <Text note>{item.text}</Text>
                </Body>
                <Right>
                  <Text note>{item.time}</Text>
                </Right>
              </ListItem>}
            renderLeftHiddenRow={data =>
              <Button full onPress={() => alert(data)}>
                <Icon active name="information-circle" />
              </Button>}
            renderRightHiddenRow={(data, secId, rowId, rowMap) =>
              <Button full danger onPress={_ => this.deleteRow(secId, rowId, rowMap)}>
                <Icon active name="trash" />
              </Button>}
            leftOpenValue={75}
            rightOpenValue={-75}
          />
        </Content>
      </Container>
    );
  }
}

export default ConversationScreen;