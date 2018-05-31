import React from 'react';
import { connect } from 'react-redux'
import { AsyncStorage, View, ListView, StyleSheet, TouchableOpacity, NativeModules } from 'react-native';
import TouchableRow from './contacts/Row';
// import Header from './contacts/Header';
import Footer from './contacts/Footer';
import SectionHeader from './contacts/SectionHeader';
import { SearchBar, Text } from 'react-native-elements'
import { Button, Container, Header, Content, List, ListItem, Left, Body, Right, Item, Icon, Input, Thumbnail, Title } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firebase from 'react-native-firebase';
import { EngineSelectors } from '../Redux/EngineRedux'
import EngineWrapper from '../Engine/EngineWrapper'

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

const pictures = [
  'https://gaia.blockstack.org/hub/12ELFuCsjCx5zxVDyNxttnYe9VLrRbLuMm/0/avatar-0',  // pbj.id
  'https://gaia.blockstack.org/hub/1GHZbCnbufz53Skb79FwnwuedW4Hhe2VhR/0/avatar-0',  // alexc.id
  'https://gaia.blockstack.org/hub/1P4So8DUfo9nC8RQvgfRhLzSyqGiAu8FPA//avatar-0',   // stealthy.id
  'https://gaia.blockstack.org/hub/1Lac25uJk3c6BXLACtN56ARFf1NdqzoaaS//avatar-0',   // relay.stealthy.id
  'https://gaia.blockstack.org/hub/1J3PUxY5uDShUnHRrMyU6yKtoHEUPhKULs/0/avatar-0',  // muneeb.id
  'https://gaia.blockstack.org/hub/1BiG7hjHukZFd2sZiJFhs8W93pgaUbVeYp/0/avatar-0',  // xan.id
  // 'https://react.semantic-ui.com/assets/images/avatar/large/steve.jpg',
  // 'https://react.semantic-ui.com/assets/images/avatar/large/molly.png',
  // 'https://react.semantic-ui.com/assets/images/avatar/large/jenny.jpg',
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
      listViewData: [],
      loaded: false
    };
  }
  componentWillMount() {
    this.props.navigation.setParams({ goToChatRoom: this.props.navigation, sendMessage: this.sendTestMessageToFirebase });
  }
  componentDidMount() {
    this.updateContacts()
  }
  updateContacts() {
    const { contactMgr } = this.props
    if (contactMgr) {
      // console.log(`  ${userIds.length} contacts ...`);
      const userIds = contactMgr.getContactIds()
      let i = 0
      let list = []
      for (const userId of userIds) {
        let index = i%(pictures.length-1)
        let picture = pictures[index]
        list.push({name: userId, picture})
        i++
      }
      this.setState({listViewData: list, loaded: true})
    }
  }
  contactSelected = () => {
    const { contactMgr } = this.props
    if (contactMgr) {
      // An example showing how to set the active contact (results in an me-update-messages event).
      // Setting to a contact that both pbj/ac have convo data with.
      // TODO: PBJ delete me and integrate to your awesome iOS person picker.
      const theNextActiveContactId = (this.fakeUserId = 'alexc.id') ?  'pbj.id' : 'alexc.id';
      const theNextActiveContact = contactMgr.getContact(theNextActiveContactId);
      EngineWrapper.Instance.handleContactClick(theNextActiveContact);
    }
    this.props.navigation.navigate('ChatRoom')
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
              <ListItem style={{marginLeft: 5}} avatar onPress={this.contactSelected}>
                <Left>
                  <Thumbnail source={{ uri: item.picture}} />
                </Left>
                <Body>
                  <Text>{item.name}</Text>
                  <Text note>Hello World</Text>
                </Body>
                <Right>
                  <Text note>12:00</Text>
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

const mapStateToProps = (state) => {
  return {
    contactMgr: EngineSelectors.getContactMgr(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ConversationScreen)
