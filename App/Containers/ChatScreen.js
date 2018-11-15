import React, { Component } from 'react'
import { Platform, Image, Modal, Keyboard, StyleSheet, ScrollView, TouchableOpacity, TouchableHighlight, WebView, View, Text } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button, Icon } from 'react-native-elements'

import { Container, Header, Content, Item, Form, Textarea, Toast } from 'native-base';

// Styles
import styles from './Styles/ChatStyle'
import {GiftedChat, Actions, Bubble, SystemMessage, InputToolbar} from 'react-native-gifted-chat';
import CustomView from './chat/CustomView';
import TwitterShareActions from '../Redux/TwitterShareRedux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import DappActions, { DappSelectors } from '../Redux/DappRedux'
import Communications from 'react-native-communications';
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');

const { MESSAGE_STATE } = require('./../Engine/messaging/chatMessage.js');

class ChatScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTitle: params.name,
      // headerRight: (
      //   // <TouchableOpacity onPress={() => console.log('cool')} style={{marginRight: 10}}>
      //   <TouchableOpacity onPress={() => params.navigation.navigate("ContactProfile")} style={{marginRight: 10}}>
      //     <Ionicons name="ios-contact" size={28} color='white'/>
      //   </TouchableOpacity>
      // ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      loadEarlier: false,
      typingText: null,
      isLoadingEarlier: false,
      activeContact: null,
      token: '',
      publicKey: '',
      modalVisible: false,
      sharedUrl: '',
      drawerOpen: false,
      drawerDisabled: false,
      inputText: ''
    };

    this._isMounted = false;
    this._isAlright = null;
    this.activeContact = undefined;
    this.publicKey = undefined
    this.displayname = ''
    this.delegate = true
  }
  configWithActiveContact = (anActiveContact, administrable=false, force=false, callSetState=false) => {
    const method = 'ChatScreen::configWithActiveContact'
    console.log(`INFO(${method}): anActiveContact=${anActiveContact}`)

    if ((this.activeContact && !force) || !anActiveContact) {
      return
    }

    this.delegate = administrable

    console.log(`INFO(${method}): anActiveContact.id=${anActiveContact.id}`)

    this.activeContact = anActiveContact
    this.publicKey = (this.activeContact) ? this.activeContact.publicKey : undefined

    const notificationPath = common.getDbNotificationPath(anActiveContact.publicKey)
    firebaseInstance.getFirebaseRef(`${notificationPath}/token`).once('value')
    .then((snapshot) => {
      if (snapshot.val()) {
        if (!callSetState) {
          this.state.token = snapshot.val()
        } else {
          this.setState({
            token: snapshot.val()
          })
        }
      }
    });
    console.log(`INFO(${method}): check #2 anActiveContact=${anActiveContact}`)
    console.log(`INFO(${method}): check #2 anActiveContact=${anActiveContact}`)
    this.displayname = (anActiveContact.title) ? anActiveContact.title : anActiveContact.id
    this.props.navigation.setParams({ navigation: this.props.navigation, name: this.displayname });
  }
  componentWillMount() {
    this._isMounted = true;

    const { userData, userProfile } = this.props
    const { username } = userData
    const { profile } = userProfile
    const { name, image } = profile
    let userImage = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
    if (image && image[0]) {
      userImage = image[0].contentUrl
    }
    this.state.author = {
      username,
      name,
      userImage
    }

    const { contactMgr } = this.props
    const activeContact = (contactMgr && contactMgr.getActiveContact()) ?
      contactMgr.getActiveContact() : undefined
    const administrable = (activeContact && contactMgr.isAdministrable(activeContact.id)) ? true : false

    if (activeContact) {
      this.configWithActiveContact(activeContact, administrable)

      const { messages } = this.props;
      if (messages) {
        this.state.messages = this.setupMessages(messages).reverse();
      }
    }
  }
  componentWillReceiveProps(nextProps) {
    if (!this.activeContact) {
      return
    }
    if (!this.publicKey) {
      if (nextProps.contactMgr && nextProps.contactMgr.hasPublicKey()) {
        const activeContact = nextProps.contactMgr.getActiveContact()
        // Ugly AF configWithActiveContact designed to be called before UI
        // exists. Modified it to work after UI exists with setState call option.
        const administrable = (activeContact && contactMgr.isAdministrable(activeContact.id)) ? true : false
        const FORCE = true
        const CALL_SET_STATE = true
        this.configWithActiveContact(activeContact, administrable, FORCE, CALL_SET_STATE)
      }
    }
    const { messages, dappUrl, dappMessage } = nextProps
    if (dappMessage) {
      const { author } = this.state
      const { username, name, userImage } = author
      const start = new Date(Date.now())
      const time = start.toString()
      const {title} = dappMessage
      // TODO: custom renderer with graphite icon
      const graphiteLogo = 'https://image.ibb.co/hde71b/AppIcon.png'
      const travelstackLogo = 'https://app.travelstack.club/icon-192x192.png'
      const image = (dappUrl.includes('serene-hamilton') ||
                     dappUrl.includes('graphite')) ?
                     graphiteLogo : travelstackLogo
      // const messageContent = `${name} shared "${dappData.title}" with you:\n\n${dappUrl}`
      const fileMessage = [{
        createdAt: time,
        text: title,
        image,
        url: dappUrl,
        user: {
          _id: username,
          name: name,
          avatar: userImage
        },
        _id: start,
      }]
      this.onSend(fileMessage)
      this.props.setDappMessage(null)
    }
    else if (this.props.messages && this.props.messages.length !== messages.length) {
      //
      // TODO: Prabhaav, the code to handle 'TEXT' & 'TEXT_JSON' is duplicated
      //       below from method setupMessages. We should unify it so it doesn't
      //       cause crashes when we forget to fix both pieces of code when we add
      //       new message types.
      //
      const numNewMsgs = messages.length - this.props.messages.length;
      let newMessages = [];
      for (const idx = messages.length-numNewMsgs; idx < messages.length; idx++) {
        const msg = messages[idx]
        const { author } = msg
        if (author !== this.state.author.username) {
          const { body, time, image, contentType } = msg
          let url, press, gimage
          if (contentType === 'TEXT') {
            text = body
            url = ''
            gimage = ''
          }
          else if (contentType === 'TEXT_JSON') {
            text = body.text
            url = body.url
            gimage = body.image
          }
          const newMessage = {
            _id: Math.round(Math.random() * 1000000),
            text,
            image: gimage,
            url,
            createdAt: time,
            user: {
              _id: author,
              name: author,
              avatar: image,
            },
          }
          newMessages.splice(0, 0, newMessage);
        }
      }
      this.onReceive(newMessages)
    }
  }
  componentWillUnmount() {
    this._isMounted = false;
    this.props.handleContactClick()
  }
  setupMessages = (inputMessages) => {
    let messages = []
    let { description, id } = this.activeContact
    for (const message of inputMessages) {
      const { author, body, time, image, state, contentType } = message
      const sent = (state === MESSAGE_STATE.SENT_OFFLINE || state === MESSAGE_STATE.SENT_REALTIME || state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      const received = (state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      let gtext, url, gimage, press
      if (contentType === 'TEXT') {
        text = body
        url = ''
        gimage = ''
      }
      else if (contentType === 'TEXT_JSON') {
        text = body.text
        url = body.url
        gimage = body.image
      }
      if (author === id) {
        messages.push({
          _id: Math.round(Math.random() * 1000000),
          text,
          url,
          image: gimage,
          createdAt: time,
          sent: sent,
          received: received,
          user: {
            _id: author,
            name: description,
            avatar: image,
          },
        })
      }
      else {
        messages.push({
          _id: Math.round(Math.random() * 1000000),
          text,
          url,
          image: gimage,
          createdAt: time,
          sent: sent,
          received: received,
          user: {
            _id: author,
            name: author,
            avatar: image,
          },
        })
      }
    }
    return messages;
  }
  onLoadEarlier = () => {
    this.setState((previousState) => {
      return {
        isLoadingEarlier: true,
      };
    });

    setTimeout(() => {
      if (this._isMounted === true) {
        this.setState((previousState) => {
          return {
            messages: GiftedChat.prepend(previousState.messages, require('./data/old_messages.js')),
            loadEarlier: false,
            isLoadingEarlier: false,
          };
        });
      }
    }, 1000); // simulating network
  }
  onSend = (messages = [], json) => {
    const { token } = this.state
    const { publicKey, bearerToken } = this.props
    if (token) {
      this.props.sendNotification(token, publicKey, bearerToken)
    }
    const {text, gtext, image, url} = messages[0]
    if (image && url) {
      this.props.handleOutgoingMessage(undefined, messages[0])
    }
    else if (text) {
      this.props.handleOutgoingMessage(text, undefined);
    }
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, messages),
      };
    });
    //call twitter share after first send
    this.props.shareInit()
  }
  onReceive = (newMessages) => {
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, newMessages),
      };
    });
  }
  setModalVisible = (flag) => {
    console.log("flag", flag)
    this.setState({modalVisible: flag})
  }
  renderCustomActions = (props) => {
    return (
      <TouchableOpacity
        style={[styles.chatContainer, this.props.containerStyle]}
        onPress={() => this.props.navigation.navigate('DappData')}
      >
        <Ionicons name="ios-aperture" size={28} color='#34bbed' />
      </TouchableOpacity>
    )
  }
  renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: '#f0f0f0',
          }
        }}
      />
    );
  }
  renderSystemMessage = (props) => {
    return (
      <SystemMessage
        {...props}
        containerStyle={{
          marginBottom: 15,
        }}
        textStyle={{
          fontSize: 14,
        }}
      />
    );
  }
  renderCustomView = (props) => {
    return (
      <CustomView
        {...props}
        onPress={this.onPressUrl}
      />
    );
  }
  renderFooter = (props) => {
    if (this.state.typingText) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {this.state.typingText}
          </Text>
        </View>
      );
    }
    return null;
  }
  renderInputToolbar = (props) => {
     //Add the extra styles via containerStyle
    return (
      <InputToolbar
        {...props}
      />
    )
  }
  onPressUrl = (url) => {
    this.props.setDappUrl(url)
    this.props.navigation.navigate('DappScreen')
  }
  setCustomText = (inputText) => {
    this.setState({inputText})
  }
  addToInput = (text) => {
    const newText = this.state.inputText + text
    this.setState({inputText: newText})
    this.closeDrawer()
  }
  render() {
    if (!this.publicKey) {
      const {id} = this.activeContact
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
          <Text style={{fontSize: 18, fontWeight: 'bold'}}>
            {id} has not used Stealthy yet!
          </Text>
          <Text style={{marginTop: 30, marginRight: 5, marginLeft: 5}}>Stealthy uses {id}'s public key to encrypt data</Text>
          <Text style={{marginTop: 30, marginBottom: 20, marginRight: 5, marginLeft: 5, fontSize: 16}}>Invite {id} to securely chat with you!</Text>
          <View style={{flexDirection: 'row', margin: 5}}>
            <Button
              backgroundColor={'#34bbed'}
              onPress={() => {
                console.log('refresh')
                this.props.updateContactPubKey(id)
              }}
              icon={{name: 'refresh', color: 'white'}}
              title='Refresh'
              raised
            />
            <Button
              backgroundColor={'#34bbed'}
              onPress={() => Communications.text('')}
              icon={{name: 'chat', color: 'white'}}
              title='Text'
            />
            <Button
              backgroundColor={'#34bbed'}
              onPress={() => Communications.email([''],null,null,'Add me on Stealthy IM','')}
              icon={{name: 'email', color: 'white'}}
              title='Email'
              raised
            />
          </View>
        </View>
      )
    }
    return (
      <View id='GiftedChatContainer'
           style={{flex: 1,
                   backgroundColor: 'white'}}>
        <GiftedChat
          ref={(ref) => this._giftedChat = ref}
          messages={this.state.messages}
          onSend={this.onSend}
          loadEarlier={this.state.loadEarlier}
          onLoadEarlier={this.onLoadEarlier}
          onPressAvatar={() => this.props.navigation.navigate('ContactProfile')}
          isLoadingEarlier={this.state.isLoadingEarlier}
          user={{
            _id: this.state.author.username, // sent messages should have same user._id
          }}
          text={this.state.inputText}
          renderActions={this.renderCustomActions}
          renderBubble={this.renderBubble}
          renderSystemMessage={this.renderSystemMessage}
          renderMessageImage={this.renderCustomView}
          renderFooter={this.renderFooter}
          maxInputLength={240}
          renderInputToolbar={this.renderInputToolbar}
          parsePatterns={(linkStyle) => [
            { type: 'url', style: linkStyle, onPress: this.onPressUrl },
          ]}
          onInputTextChanged={text => this.setCustomText(text)}
          onLongPress={(ctx, currentMessage) => console.log(ctx, currentMessage)}
        />
      </View>
    );
  }
}

const drawerStyles = {
  drawer: { shadowColor: '#000000', shadowOpacity: 0.8, shadowRadius: 3},
  main: {paddingLeft: 3},
}

const mapStateToProps = (state) => {
  return {
    userData: EngineSelectors.getUserData(state),
    messages: EngineSelectors.getMessages(state),
    contactMgr: EngineSelectors.getContactMgr(state),
    userProfile: EngineSelectors.getUserProfile(state),
    publicKey: EngineSelectors.getPublicKey(state),
    bearerToken: EngineSelectors.getBearerToken(state),
    dappUrl: DappSelectors.getDappUrl(state),
    dappMessage: DappSelectors.getDappMessage(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    shareInit: () => dispatch(TwitterShareActions.shareInit()),
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
    sendNotification: (token, publicKey, bearerToken) => dispatch(EngineActions.sendNotification(token, publicKey, bearerToken)),
    handleContactClick: () => dispatch(EngineActions.setActiveContact(undefined)),
    updateContactPubKey: (aContactId) => dispatch(EngineActions.updateContactPubKey(aContactId)),
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
    setDappMessage: (dappMessage) => dispatch(DappActions.setDappMessage(dappMessage)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatScreen)
