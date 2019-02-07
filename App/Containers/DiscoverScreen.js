import React, { Component } from 'react'
import { ActivityIndicator, ListView, View, StyleSheet } from 'react-native'
import { Text, Divider } from 'react-native-elements'
import { Button, Container, Content, List, ListItem, Left, Body, Right, Icon, Thumbnail } from 'native-base'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import {NavigationActions} from 'react-navigation'
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20
  },
  separator: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#8E8E8E'
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10
  }
})

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
    this.ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 })
    this.state = {
      channelClicked: false,
      showLoading: true,
      showNothing: true,
      channels: [],
      channelId: ''
    }
    this.numContacts = (props.contactMgr)
      ? (props.contactMgr.getContacts().length) : 0
  }
  // componentWillMount() {
  //   this.props.navigation.setParams({ navigation: this.props.navigation });
  // }
  componentWillReceiveProps (nextProps) {
    const method = 'DiscoverScreen::componentWillReceiveProps'

    const { contactAdded, contactMgr } = nextProps
    const { channelClicked, channelId } = this.state

    // AC: Begin debug output
    console.log(`INFO(${method}): channelClicked=${channelClicked}, contactAdded=${contactAdded}`)
    if (contactMgr) {
      console.log(`INFO(${method}): contactMgr length=${contactMgr.getContacts().length}`)
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

      this.numContacts = contactMgr.getContacts().length
      this.setState({channelClicked: false, channelId: ''})
      // this.props.navigation.navigate('ChatRoom')
      // const params = {id: channelId}
      // const params = {id: ''}
      // this.props.pushToChannel('Messages', params)
      this.props.setContactAdded(false)
      this.props.closeDrawer()
    }
  }
  contactSelected = (data, secId, rowId, rowMap) => {
    const method = 'DiscoverScreen::contactSelected'
    console.log(`INFO(${method}): selected contact ${data.id}`)
    this.props.addNewContact(data, false)
    console.log(`INFO(${method}): called addNewContact for ${data.id}`)
    // this.props.setActiveContact(data);
    // console.log(`INFO(${method}): called setActiveContact for ${data.id}`)

    rowMap[`${secId}${rowId}`].props.closeRow()
    let newData = this.state.channels
    delete newData[rowId]
    this.setState({ channelClicked: true, channelId: data.id, channels: newData })
    this.props.handleContactUnmute(data)
    // AC: Begin debug output
    console.log(`INFO(${method}): called setState channelClicked-->true for ${data.id}`)
    // AC: End debug output
  }
  render () {
    let channels = {}
    if (this.props.channels) {
      for (let ch in this.props.channels) {
        // console.log("PBJ INFO", ch, this.props.channels[ch])
        const {id} = this.props.channels[ch]
        const exists = this.props.contactMgr.isExistingContactId(id)
        if (!exists) { channels[ch] = this.props.channels[ch] }
      }
      // this.setState({
      //   channels,
      //   showLoading: false
      // })
    }
    if (this.state.channelClicked) {
      return <View style={[styles.container, styles.horizontal]}><ActivityIndicator size='large' color='#FFF' /></View>
    } else {
      return (
        <Container style={{backgroundColor: 'white'}}>
          <Content>
            <List
              removeClippedSubviews={false}
              dataSource={this.ds.cloneWithRows(channels)}
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
                  <Icon active name='trash' />
                </Button>}
              rightOpenValue={0}
            />
          </Content>
        </Container>
      )
    }
  }
}

const mapStateToProps = (state) => {
  return {
    contactAdded: EngineSelectors.getContactAdded(state),
    channels: EngineSelectors.getChannelsData(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    pushToChannel: (routeName, params) => dispatch(NavigationActions.navigate({
      routeName,
      params
    })),
    addNewContact: (contact, flag) => dispatch(EngineActions.addNewContact(contact, flag)),
    setContactAdded: (flag) => dispatch(EngineActions.setContactAdded(flag)),
    setActiveContact: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    handleContactClick: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    handleContactUnmute: (contact) => dispatch(EngineActions.handleContactUnmute(contact))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DiscoverScreen)
