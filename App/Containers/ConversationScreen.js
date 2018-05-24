import React from 'react';
import { AsyncStorage, View, ListView, StyleSheet, TouchableOpacity, NativeModules } from 'react-native';
import TouchableRow from './contacts/Row';
// import Header from './contacts/Header';
import Footer from './contacts/Footer';
import SectionHeader from './contacts/SectionHeader';
import { SearchBar, Text } from 'react-native-elements'
import { Button, Container, Header, Content, List, ListItem, Left, Body, Right, Item, Icon, Input, Thumbnail, Title } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firebase from 'react-native-firebase';

const { MessagingEngine } = require('./../Engine/engine.js');

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
  'https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg',
  'https://react.semantic-ui.com/assets/images/avatar/large/matt.jpg',
  'https://react.semantic-ui.com/assets/images/avatar/large/matthew.png',
  'https://react.semantic-ui.com/assets/images/avatar/large/elliot.jpg',
  'https://react.semantic-ui.com/assets/images/avatar/large/steve.jpg',
  'https://react.semantic-ui.com/assets/images/avatar/large/molly.png',
  'https://react.semantic-ui.com/assets/images/avatar/large/jenny.jpg',
]

export default class ConversationScreen extends React.Component {
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
    this.tempContactMgr = undefined;  // TODO: PBJ delete me and refs when contact click is working.

    this.engine = this._initEngineNoData();
    this.engine.on('me-initialized', () => {
      // this.setState({initWithFetchedData: true});
      this.engineInit = true;

      if (this.tempContactMgr) {
        // An example showing how to set the active contact (results in an me-update-messages event).
        // Setting to a contact that both pbj/ac have convo data with.
        // TODO: PBJ delete me and integrate to your awesome iOS person picker.
        const theNextActiveContactId = (this.fakeUserId = 'alexc.id') ?  'pbj.id' : 'alexc.id';
        const theNextActiveContact = this.tempContactMgr.getContact(theNextActiveContactId);

        this.engine.handleContactClick(theNextActiveContact);
      }
    });
    this.engine.on('me-update-contactmgr', (aContactMgr) => {
      // console.log(`Messaging Engine updated contact manager:`)
      const userIds = aContactMgr ? aContactMgr.getContactIds() : [];
      this.updateContacts(userIds)
      // this.props.storeContactMgr(aContactMgr);

      this.tempContactMgr = aContactMgr;
    });
    this.engine.on('me-update-messages', (theMessages) => {
      console.log(`Messaging Engine updated messages: ${theMessages}`)
      // this.props.storeMessages(theMessages);

      if (theMessages) {
        // An example printing out the message data.
        // TODO: PBJ use this to integrate to your chat component
        console.log('Messages Object:');
        console.log('---------------------------------------------------------');
        for (const message of theMessages) {
          // TODO: include message.image when we get the avatarUrl & recipientImageUrl
          console.log(`${message.author}: "${message.body}"  (seen:${message.seen} time:${message.time} state:${message.state})`);
        }
        console.log('')
      }
    });
    this.engineInit = false;
    // this.fakeUserId = 'alexc.stealthy.id';
    this.fakeUserId = 'alexc.id';
    // this.fakeUserId = 'pbj.id';
  }
  logger = (...args) => {
    // if (process.env.NODE_ENV === 'development' || this.state.console) {
      // console.log(...args);
    // }
  }
  componentDidMount() {
    this.engine.componentDidMountWork(this.engineInit, this.fakeUserId);
  }
  componentWillMount() {
    this.props.navigation.setParams({ goToChatRoom: this.props.navigation, sendMessage: this.sendTestMessageToFirebase });
  }
  updateContacts(userIds) {
    if (!this.state.loaded) {
      // console.log(`  ${userIds.length} contacts ...`);
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
  _initEngineNoData = () => {
    // Start the engine:
    const logger = this.logger;
    const privateKey = '1';
    const publicKey = '2';
    const isPlugIn = false;
    const avatarUrl = '';  // TODO
    const discoveryPath = ''; // TODO
    const engine =
      new MessagingEngine(logger,
                          privateKey,
                          publicKey,
                          isPlugIn,
                          avatarUrl,
                          discoveryPath);

    return engine;
  }
  _getUserData = () => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        throw(`Failed to get user data.  ${error}`);
      } else {
        console.log(`SUCCESS (getUserData):\n`);
        for (const key in userData) {
          console.log(`\t${key}: ${userData[key]}`)
        }
        // Get public key:
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], (error, publicKey) => {
            if (error) {
              throw(`Failed to get public key from private. ${error}`);
            } else {
              console.log(`SUCCESS (loadUserDataObject): publicKey = ${publicKey}\n`);
              // Start the engine:
              const logger = undefined;
              const privateKey = userData['privateKey'];
              const isPlugIn = false;
              const avatarUrl = '';  // TODO
              const discoveryPath = ''; // TODO
              this.engine =
                new MessagingEngine(logger,
                                    privateKey,
                                    publicKey,
                                    isPlugIn,
                                    this.props.avatarUrl,
                                    this.props.path);

              // Test encryption
              // let testString = "Concensus";
              // BlockstackNativeModule.encryptPrivateKey(publicKey, testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptPrivateKey): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptPrivateKey(userData['privateKey'], cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptPrivateKey): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test encryptContent / decryptContent
              // let testString = "Content works?";
              // BlockstackNativeModule.encryptContent(testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt with encryptContent: ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptContent): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptContent(cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt with decryptContent: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptContent): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test get file on pk.txt path.
              // BlockstackNativeModule.getRawFile('pk.txt', (error, array) => {
              //   console.log('After getFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${array}`);
              //   console.log('');
              // });

              // Test write/read cycle:
              // BlockstackNativeModule.putFile('testWrite.txt',
              //                                'Will this work?',
              //                                (error, content) => {
              //   console.log('wrote testWrite.txt');
              //   console.log('After putFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${content}`);
              //   console.log('');
              //
              //   BlockstackNativeModule.getFile('testWrite.txt', (error, content) => {
              //     console.log('read testWrite.txt');
              //     console.log('After getFile:');
              //     console.log('--------------------------------------------------------');
              //     console.log(`error: ${error}`);
              //     console.log(`content: ${content}`);
              //     console.log('');
              //   });
              // });
            }
        });
        return userData;
      }
    });
    return undefined;
  };
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
