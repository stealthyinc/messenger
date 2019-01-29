import React from 'react'
import { connect } from 'react-redux'
import { View, Image, ListView, TouchableOpacity, StyleSheet, Text as AText } from 'react-native'
import TwitterShareModal from '../Components/TwitterShareModal'
import { Text } from 'react-native-elements'
import { Button, Badge, Container, Content, List, ListItem, Left, Body, Right, Icon, Thumbnail } from 'native-base'
import Ionicons from 'react-native-vector-icons/Ionicons'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import TwitterShareActions, { TwitterShareSelectors } from '../Redux/TwitterShareRedux'
import { shareOnTwitter } from 'react-native-social-share'
import QRCode from 'react-native-qrcode'
import { copilot, CopilotStep } from '@okgrow/react-native-copilot'

const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const utils = require('./../Engine/misc/utils.js')

class ConversationScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {}
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.start()} style={{marginLeft: 10}}>
          <Ionicons name='md-help-circle' size={30} color='white' />
        </TouchableOpacity>
      ),
      headerTitle: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Messages</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        // params.sendMessage()
        <TouchableOpacity onPress={() => params.navigation.navigate('BlockContactSearch')} style={{marginRight: 10}}>
          <Ionicons name='ios-paper-plane' size={30} color='white' />
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    }
  };
  constructor (props) {
    super(props)
    this.ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 })
    this.state = {
      basic: true,
      listViewData: [],
      loaded: false
    }
    this.props.setSpinnerData(true, 'Loading contacts...')
    this.linkId = ''
    this.dynamicList = undefined
  }
  async componentDidMount () {
    this.props.copilotEvents.on('stepChange', this.handleStepChange);
    this.props.navigation.setParams({ navigation: this.props.navigation, sendMessage: this.sendTestMessageToFirebase, start: this.props.start })
  }
  handleStepChange = (step) => {
    console.log(`Current step is: ${step.name}`);
  }
  componentWillReceiveProps (nextProps) {
    const { contactMgr, engineInit, navigation } = nextProps
    if (engineInit && contactMgr && contactMgr.getContactIds) {
      const listViewData = contactMgr.getAllContacts()
      this.setState({listViewData})
    }
    const { params } = navigation.state
    if (params && params.id && contactMgr && !contactMgr.isExistingContactId(params.id) && this.linkId !== params.id) {
      this.props.addContactId(params.id)
      this.props.navigation.setParams({ id: '' })
      this.props.setSpinnerData(true, 'Adding contact...')
      this.linkId = params.id
    }
  }
  contactSelected = (data, secId, rowId, rowMap) => {
    const { contactMgr } = this.props
    if (contactMgr) {
      const theNextActiveContactId = data.id
      const theNextActiveContact = contactMgr.getContact(theNextActiveContactId)
      this.props.handleContactClick(theNextActiveContact)
      this.protocol = (theNextActiveContact)
        ? utils.isChannelOrAma(theNextActiveContact.protocol) : false
      if (this.protocol) { this.props.navigation.navigate('ChannelRoom') } else { this.props.navigation.navigate('ChatRoom') }
      rowMap[`${secId}${rowId}`].props.closeRow()
    }
  }
  muteRow = (data, secId, rowId, rowMap) => {
    const deleteContactId = data.id
    // check for channel and subscribe
    // today this is only a .stealthy.id
    if (deleteContactId.indexOf('.stealthy.id') > -1) {
      const { contactMgr } = this.props
      const theNextActiveContact = contactMgr.getContact(deleteContactId)
      if (contactMgr.isNotifications(deleteContactId)) {
        this.props.handleContactMute(theNextActiveContact)
      } else {
        this.props.handleContactUnmute(theNextActiveContact)
      }
    }
    rowMap[`${secId}${rowId}`].props.closeRow()
  }
  deleteRow = (data, secId, rowId, rowMap) => {
    const { contactMgr } = this.props
    const deleteContactId = data.id
    const deleteContact = contactMgr.getContact(deleteContactId)
    // check for channel and subscribe
    // today this is only a .stealthy.id
    if (deleteContactId.indexOf('.stealthy.id') > -1) {
      const theNextActiveContact = contactMgr.getContact(deleteContactId)
      this.props.handleContactMute(theNextActiveContact)
    }
    this.props.handleDeleteContact(deleteContact)
    rowMap[`${secId}${rowId}`].props.closeRow()
    const newData = [...this.state.listViewData]
    newData.splice(rowId, 1)
    this.setState({ listViewData: newData })
  }
  sendToTwitter = () => {
    const { username } = this.props.userData
    const text = `You can securely message me at: ` + username + ` on @stealthyim! #decentralize #takebackcontrol #controlyourdata https://www.stealthy.im`
    shareOnTwitter({
      text
    },
    (results) => {
      console.log(results)
      this.props.shareSuccess()
      this.props.updateUserSettings('twitterShare')
    })
  }
  render () {
    const { contactMgr, activateShare, userSettings, engineInit } = this.props
    if (engineInit) {
      const badgeAlignWorkaround = utils.isAndroid() ? -1 : -5
      const CustomComponent = ({ copilot }) => (
        <View {...copilot}>
          <List
            removeClippedSubviews={false}
            closeOnRowBeginSwipe={true}
            closeOnRowPress={true}
            ref={(c) => { this.dynamicList = c }}
            dataSource={this.ds.cloneWithRows(this.state.listViewData)}
            renderRow={(item, secId, rowId, rowMap) =>
              <ListItem style={{marginLeft: 5}} avatar onPress={_ => this.contactSelected(item, secId, rowId, rowMap)}>
                <Left>
                  {(item.base64 || item.image) ? (<Thumbnail square source={{ uri: (item.base64) ? item.base64 : item.image }} />)
                  : (<QRCode
                    value={item.id}
                    size={55}
                    bgColor='black'
                    fgColor='white'
                  />)
                }
                </Left>
                <Body>
                  <Text style={{fontWeight: 'bold', fontSize: 18}}>{(item.title) ? item.title : item.id}</Text>
                  <Text note numberOfLines={1}>{item.summary}</Text>
                </Body>
                {(item.unread > 0) ? <Right style={{ top: badgeAlignWorkaround}}>
                  <Badge style={{ backgroundColor: 'red' }}>
                    <Text style={{color: 'white'}}>{item.unread}</Text>
                  </Badge>
                </Right> : null}
              </ListItem>}
            renderLeftHiddenRow={(data, secId, rowId, rowMap) =>
              <Button full warning onPress={_ => this.muteRow(data, secId, rowId, rowMap)}>
                <Icon active name='notifications-off' />
              </Button>}
            leftOpenValue={75}
            renderRightHiddenRow={(data, secId, rowId, rowMap) =>
              <Button full danger onPress={_ => this.deleteRow(data, secId, rowId, rowMap)}>
                <Icon active name='trash' />
              </Button>}
            rightOpenValue={-75}
          />
        </View>
      )
      return (
        <Container style={{backgroundColor: 'white'}}>
          <Content>
            <CopilotStep text="This where you can view your contacts. Swipe the contact left to mute, and right to delete" order={1} name="contacts">
              <CustomComponent />
            </CopilotStep>
          </Content>
        </Container>
      )
    }
    return null
  }
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    textAlign: 'center',
  },
  tabItem: {
    flex: 1,
    textAlign: 'center',
    alignItems: 'center'
  },
})

const mapStateToProps = (state) => {
  return {
    token: EngineSelectors.getToken(state),
    userData: EngineSelectors.getUserData(state),
    publicKey: EngineSelectors.getPublicKey(state),
    contactMgr: EngineSelectors.getContactMgr(state),
    engineInit: EngineSelectors.getEngineInit(state),
    userSettings: EngineSelectors.getUserSettings(state),
    activateShare: TwitterShareSelectors.getActivateShare(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    shareDecline: () => dispatch(TwitterShareActions.shareDecline()),
    shareSuccess: () => dispatch(TwitterShareActions.shareSuccess()),
    addContactId: (id) => dispatch(EngineActions.addContactId(id)),
    handleDeleteContact: (contact) => dispatch(EngineActions.handleDeleteContact(contact)),
    handleContactClick: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    updateUserSettings: (radio) => dispatch(EngineActions.updateUserSettings(radio)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message)),
    handleContactMute: (contact) => dispatch(EngineActions.handleContactMute(contact)),
    handleContactUnmute: (contact) => dispatch(EngineActions.handleContactUnmute(contact))
  }
}

const ConversationScreenExplained = copilot({ animated: true, overlay: 'svg' })(ConversationScreen);

export default connect(mapStateToProps, mapDispatchToProps)(ConversationScreenExplained)
