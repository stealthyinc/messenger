import React from 'react';
import { connect } from 'react-redux'
import { ActivityIndicator, AsyncStorage, View, ListView, StyleSheet, TouchableOpacity, NativeModules } from 'react-native';
import TouchableRow from './contacts/Row';
import TwitterShareModal from '../Components/TwitterShareModal'
import Footer from './contacts/Footer';
import SectionHeader from './contacts/SectionHeader';
import { SearchBar, Text } from 'react-native-elements'
import { Button, Badge, Container, Header, Content, List, ListItem, Left, Body, Right, Item, Icon, Input, Thumbnail, Title, Separator } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import TwitterShareActions, { TwitterShareSelectors } from '../Redux/TwitterShareRedux'
import { shareOnTwitter } from 'react-native-social-share';

import defaultProfile from '../Images/defaultProfile.png'
const { firebaseInstance } = require('../Engine/firebaseWrapper.js');
const common = require('./../common.js');

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
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10
  }
});

class ConversationScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Messages</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        //params.sendMessage()
        <TouchableOpacity onPress={() => params.navigation.navigate('BlockContactSearch')} style={{marginRight: 10}}>
          <Ionicons name="ios-paper-plane" size={30} color='white'/>
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
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
  async componentWillMount() {
    const { userData, token, publicKey } = this.props
    this.props.navigation.setParams({ navigation: this.props.navigation, sendMessage: this.sendTestMessageToFirebase });
  }
  componentWillReceiveProps(nextProps) {
    const { contactMgr, engineInit } = nextProps
    if (engineInit && contactMgr && contactMgr.getContactIds) {
      const listViewData = contactMgr.getAllContacts()
      this.setState({listViewData})
    }
  }
  contactSelected = (id) => {
    const { contactMgr } = this.props
    if (contactMgr) {
      const theNextActiveContactId = id;
      const theNextActiveContact = contactMgr.getContact(theNextActiveContactId);
      this.props.handleContactClick(theNextActiveContact);
    }
    this.props.navigation.navigate('ChatRoom')
  }
  deleteRow(data, secId, rowId, rowMap) {
    const { contactMgr } = this.props
    const deleteContactId = data.id;
    const deleteContact = contactMgr.getContact(deleteContactId);
    this.props.handleDeleteContact(deleteContact);
    rowMap[`${secId}${rowId}`].props.closeRow();
    const newData = [...this.state.listViewData];
    newData.splice(rowId, 1);
    this.setState({ listViewData: newData });
  }
  sendToTwitter = () => {
    shareOnTwitter({
      'text':'You can securely message me at: pbj.id on @stealthyim! #decentralize #takebackcontrol #controlyourdata https://www.stealthy.im',
    },
    (results) => {
      console.log(results);
      this.props.shareSuccess()
    })
  }
  render() {
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    const { contactMgr, activateShare } = this.props
    const activeContact = (contactMgr) ? contactMgr.getActiveContact() : undefined
    if (!contactMgr || activeContact) {
      return <View style={[styles.container, styles.horizontal]}><ActivityIndicator size="large" color="#34bbed"/></View>
    }
    else if (activateShare) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch'}}>
          <TwitterShareModal shareDecline={this.props.shareDecline} shareSuccess={this.sendToTwitter}/>
        </View>
      )
    }
    return (
      <Container style={{backgroundColor: 'white'}}>
        <Content>
          <List
            dataSource={this.ds.cloneWithRows(this.state.listViewData)}
            renderRow={item =>
              <ListItem style={{marginLeft: 5}} avatar onPress={this.contactSelected.bind(this, item.id)}>
                <Left>
                  <Thumbnail square source={(item.image) ? { uri: item.image } : defaultProfile} />
                </Left>
                <Body>
                  <Text style={{fontWeight: 'bold', fontSize: 18}}>{(item.title) ? item.title : item.id}</Text>
                  <Text note>{item.summary}</Text>
                </Body>
                {(item.unread > 0) ? <Right>
                  <Badge style={{ backgroundColor: '#34bbed' }}>
                    <Text style={{color: 'white'}}>{item.unread}</Text>
                  </Badge>
                </Right> : null}
              </ListItem>}
            renderRightHiddenRow={(data, secId, rowId, rowMap) =>
              <Button full danger onPress={_ => this.deleteRow(data, secId, rowId, rowMap)}>
                <Icon active name="trash" />
              </Button>}
            rightOpenValue={-75}
          />
        </Content>
      </Container>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    token: EngineSelectors.getToken(state),
    userData: EngineSelectors.getUserData(state),
    publicKey: EngineSelectors.getPublicKey(state),
    contactMgr: EngineSelectors.getContactMgr(state),
    engineInit: EngineSelectors.getEngineInit(state),
    activateShare: TwitterShareSelectors.getActivateShare(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    shareDecline: () => dispatch(TwitterShareActions.shareDecline()),
    shareSuccess: () => dispatch(TwitterShareActions.shareSuccess()),
    handleDeleteContact: (contact) => dispatch(EngineActions.handleDeleteContact(contact)),
    handleContactClick: (contact) => dispatch(EngineActions.setActiveContact(contact)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ConversationScreen)
