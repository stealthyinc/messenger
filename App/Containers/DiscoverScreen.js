import React, { Component } from 'react'
import { ActivityIndicator, FlatList, ListView, View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text, Divider } from 'react-native-elements'
import { Button, Badge, Container, Header, Content, List, ListItem, Left, Body, Right, Item, Icon, Input, Thumbnail, Title, Separator } from 'native-base';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
const { firebaseInstance } = require('../Engine/firebaseWrapper.js');
import {NavigationActions} from 'react-navigation';

// Styles
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

class DiscoverScreen extends Component {
  // static navigationOptions = ({ navigation }) => {
  //   const params = navigation.state.params || {};
  //   return {
  //     headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Channels</Text>,
  //     headerRight: (
  //       <TouchableOpacity onPress={() => console.log("Public Channels")} style={{marginRight: 10}}>
  //         <Ionicons name="ios-help-buoy" size={30} color='white'/>
  //       </TouchableOpacity>
  //     ),
  //     headerTintColor: 'white',
  //     headerStyle: {
  //       backgroundColor: '#34bbed'
  //     }
  //   }
  // };
  constructor (props) {
    super(props)
    this.ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.state = {
      channelClicked: false,
      showLoading: true,
      showNothing: true,
      channels: [],
      channelId: '',
    }
    this.numContacts = (props.contactMgr) ?
      (props.contactMgr.getAllContacts().length) : 0;
  }
  // componentWillMount() {
  //   this.props.navigation.setParams({ navigation: this.props.navigation });
  // }
  componentWillReceiveProps(nextProps) {
    const method = 'DiscoverScreen::componentWillReceiveProps'

    const { contactAdded, contactMgr } = nextProps
    const { channelClicked, channelId } = this.state

    // AC: Begin debug output
    console.log(`INFO(${method}): channelClicked=${channelClicked}, contactAdded=${contactAdded}`)
    if (contactMgr) {
      console.log(`INFO(${method}): contactMgr length=${contactMgr.getAllContacts().length}`)
      for (const contactId of contactMgr.getContactIds()) {
        console.log(`INFO(${method}):   ${contactId}`)
      }
    }
    console.log(`INFO(${method}):`)
    // AC: End debug output

    if (channelClicked && contactMgr && contactMgr.isExistingContactId(channelId)) {

      // AC: Begin debug output
      console.log(`INFO(${method}): in code to stop spinner ...`)
      // AC: End debug output

      this.numContacts = contactMgr.getAllContacts().length;
      this.setState({channelClicked: false, channelId: ''})
      // this.props.navigation.navigate('ChatRoom')
      // const params = {id: channelId}
      const params = {id: ''}
      // this.props.pushToChannel('Messages', params)
      this.props.setContactAdded(false)
      this.props.closeDrawer()
    }
    else if (contactMgr && this.state.channels.length === 0) {
      let channels = {}
      firebaseInstance.getFirebaseRef('/global/public_channel_v2_0/auto').once('value')
      .then(snapshot => {
        snapshot.forEach(childSnapshot => {
          const name = childSnapshot.key
          const channel = childSnapshot.val()
          const exists = contactMgr.isExistingContactId(channel.id)
          if (!exists)
            channels[name] = channel
        })
        this.setState({
          channels,
          showLoading: false
        })
        this.props.closeDrawer()
      })
      .catch(error => {
        console.log("Firebase Error", error)
      })
    }
  }
  contactSelected = (data, secId, rowId, rowMap) => {
    const method = 'DiscoverScreen::contactSelected'
    console.log(`INFO(${method}): selected contact ${data.id}`)
    this.props.addNewContact(data, false)
    console.log(`INFO(${method}): called addNewContact for ${data.id}`)
    // this.props.setActiveContact(data);
    // console.log(`INFO(${method}): called setActiveContact for ${data.id}`)

    rowMap[`${secId}${rowId}`].props.closeRow();
    let newData = this.state.channels;
    delete newData[rowId]
    this.setState({ channelClicked: true, channelId: data.id, channels: newData })
    // AC: Begin debug output
    console.log(`INFO(${method}): called setState channelClicked-->true for ${data.id}`)
    // AC: End debug output
  }
  render () {
    if (this.state.showLoading || this.state.channelClicked) {
      return <View style={[styles.container, styles.horizontal]}><ActivityIndicator size="large" color="#FFF"/></View>
    }
    else {
      return (
        <Container style={{backgroundColor: 'white'}}>
          <Content>
            <List
              removeClippedSubviews={false}
              dataSource={this.ds.cloneWithRows(this.state.channels)}
              renderRow={(item, secId, rowId, rowMap) =>
                <View>
                  <ListItem style={{marginLeft: 5}} avatar onPress={_ => this.contactSelected(item, secId, rowId, rowMap)}>
                    <Left>
                      <Thumbnail square source={{ uri: (item.base64) ? item.base64 : item.image }} />
                    </Left>
                    <Body>
                      <Text style={{fontWeight: 'bold', fontSize: 18}}>{item.title}</Text>
                      <Text note>{item.description}</Text>
                    </Body>
                    {(item.members > 0) ? <Right>
                      <Text style={{color: '#34bbed', fontSize: 15, fontWeight: 'bold'}}>{item.members} People</Text>
                    </Right> : null}
                  </ListItem>
                  <Divider style={{ backgroundColor: '#34bbed', height: 4 }} />
                </View>
              }
              renderRightHiddenRow={(data, secId, rowId, rowMap) =>
                <Button full danger onPress={_ => this.deleteRow(data, secId, rowId, rowMap)}>
                  <Icon active name="trash" />
                </Button>}
              rightOpenValue={0}
            />
          </Content>
        </Container>
      );
    }
  }
}

const mapStateToProps = (state) => {
  return {
    contactMgr: EngineSelectors.getContactMgr(state),
    contactAdded: EngineSelectors.getContactAdded(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    pushToChannel: (routeName, params) => dispatch(NavigationActions.navigate({
      routeName,
      params,
    })),
    addNewContact: (contact, flag) => dispatch(EngineActions.addNewContact(contact, flag)),
    setContactAdded: (flag) => dispatch(EngineActions.setContactAdded(flag)),
    setActiveContact: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    handleContactClick: (contact) => dispatch(EngineActions.setActiveContact(contact)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DiscoverScreen)
