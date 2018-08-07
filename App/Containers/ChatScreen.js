import React, { Component } from 'react'
import { Image, Modal, Keyboard, StyleSheet, ScrollView, TouchableOpacity, TouchableHighlight, WebView, View, Text, ActivityIndicator } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button } from 'react-native-elements'

import FileDrawer from './FileDrawer'

// Styles
import styles from './Styles/ChatStyle'
import {GiftedChat, Actions, Bubble, SystemMessage, InputToolbar} from 'react-native-gifted-chat';
import CustomView from './chat/CustomView';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import DappActions, { DappSelectors } from '../Redux/DappRedux'
import Communications from 'react-native-communications';
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');

const { MESSAGE_STATE } = require('./../Engine/messaging/chatMessage.js');

// import graphiteIcon from '../Images/Graphite.png';

class ChatScreen extends Component {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={28} color='#34bbed'/>
        </TouchableOpacity>
      ),
      headerTitle: params.name,
      headerRight: (
        // <TouchableOpacity onPress={() => console.log('cool')} style={{marginRight: 10}}>
        <TouchableOpacity onPress={() => params.navigation.navigate("ContactProfile")} style={{marginRight: 10}}>
          <Ionicons name="ios-contact" size={28} color='#34bbed'/>
        </TouchableOpacity>
      ),
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
    };

    this._isMounted = false;
    this._isAlright = null;
    this.activeContact = undefined;
  }

  configWithActiveContact = (anActiveContact) => {
    if (this.activeContact || !anActiveContact) {
      return
    }

    this.activeContact = anActiveContact

    const notificationPath = common.getDbNotificationPath(anActiveContact.publicKey)
    firebaseInstance.getFirebaseRef(`${notificationPath}/token`).once('value')
    .then((snapshot) => {
      if (snapshot.val()) {
        this.state.token = snapshot.val()
      }
    });

    const displayname = (anActiveContact.title) ? anActiveContact.title : anActiveContact.id
    this.props.navigation.setParams({ navigation: this.props.navigation, name: displayname });
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

    if (activeContact) {
      this.configWithActiveContact(activeContact)

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
    const { messages, dappUrl, dappMessage } = nextProps
    if (dappMessage) {
      const { author } = this.state
      const { username, name, userImage } = author
      const start = new Date(Date.now())
      const time = start.toString()
      const {title} = dappMessage
      // TODO: custom renderer with graphite icon
      const graphiteLogo = 'https://image.ibb.co/hde71b/AppIcon.png'
      // const messageContent = `${name} shared "${dappData.title}" with you:\n\n${dappUrl}`
      const fileMessage = [{
        createdAt: time,
        text: null,
        image: null,
        gtext: title,
        gimage: graphiteLogo,
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
      const numNewMsgs = messages.length - this.props.messages.length;
      let newMessages = [];
      for (const idx = messages.length-numNewMsgs; idx < messages.length; idx++) {
        const msg = messages[idx]
        const { author } = msg
        if (author !== this.state.author.username) {
          const { body, time, image, contentType } = msg
          let gtext, url, gimage, press
          if (contentType === 'TEXT') {
            text = body
            url = ''
            gimage = ''
          }
          else if (contentType === 'TEXT_JSON') {
            text = undefined
            gtext = body.gtext
            url = body.url
            gimage = body.gimage
          }
          const newMessage = {
            _id: Math.round(Math.random() * 1000000),
            text,
            gtext,
            gimage,
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
    const { description, id } = this.activeContact
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
        text = undefined
        gtext = body.gtext
        url = body.url
        gimage = body.gimage
      }
      if (author === id) {
        messages.push({
          _id: Math.round(Math.random() * 1000000),
          gtext,
          text,
          url,
          gimage: gimage,
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
          gtext,
          text,
          url,
          gimage: gimage,
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
    const {text, gtext, gimage, url} = messages[0]
    if (gimage && url) {
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
  }

  onReceive = (newMessages) => {
    if (newMessages.length > 0) {
      this.setState((previousState) => {
        return {
          messages: GiftedChat.append(previousState.messages, newMessages),
        };
      });
    }
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

  renderInputToolbar (props) {
     //Add the extra styles via containerStyle
    return <InputToolbar {...props} containerStyle={{marginBottom: 5, borderTopWidth: 1.5, borderTopColor: '#333'}} />
  }

  onPressUrl = (url) => {
    this.props.setDappUrl(url)
    this.props.navigation.navigate('DappScreen')
  }

  render() {
    const { publicKey } = this.activeContact
    if (!publicKey) {
      const {id} = this.activeContact
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
          <Text style={{fontSize: 18, fontWeight: 'bold'}}>{id} has not used Stealthy yet!</Text>
          <Text style={{marginTop: 30, marginRight: 5, marginLeft: 5}}>Stealthy uses {id}'s public key to encrypt data</Text>
          <Text style={{marginTop: 30, marginRight: 5, marginLeft: 5, fontSize: 16}}>Invite {id} to securely chat with you!</Text>
          <View style={{flexDirection: 'row', marginTop: 20}}>
            <Button
              backgroundColor={'#34bbed'}
              onPress={() => Communications.email([''],null,null,'Add me on Stealthy IM','')}
              icon={{name: 'email', color: 'white'}}
              title='Email'
              raised
            />
            <View style={{margin: 10}} />
            <Button
              backgroundColor={'#34bbed'}
              onPress={() => Communications.text('')}
              icon={{name: 'chat', color: 'white'}}
              title='Message'
            />
          </View>
        </View>
      )
    }
    const content = this.activeContact ?
        (<GiftedChat
          messages={this.state.messages}
          onSend={this.onSend}
          loadEarlier={this.state.loadEarlier}
          onLoadEarlier={this.onLoadEarlier}
          isLoadingEarlier={this.state.isLoadingEarlier}
          user={{
            _id: this.state.author.username, // sent messages should have same user._id
          }}
          renderActions={this.renderCustomActions}
          renderBubble={this.renderBubble}
          renderSystemMessage={this.renderSystemMessage}
          renderCustomView={this.renderCustomView}
          renderFooter={this.renderFooter}
          renderInputToolbar={this.renderInputToolbar}
          parsePatterns={(linkStyle) => [
            { type: 'url', style: linkStyle, onPress: this.onPressUrl },
          ]}
        />)
      :
        (<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
          <ActivityIndicator size="large" color="#34bbed"/>
        </View>)

    return (
      <View id='GiftedChatContainer'
           style={{flex: 1,
                   backgroundColor: 'white'}}>
        {content}
      </View>
    );
  }
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
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
    sendNotification: (token, publicKey, bearerToken) => dispatch(EngineActions.sendNotification(token, publicKey, bearerToken)),
    handleContactClick: () => dispatch(EngineActions.setActiveContact(undefined)),
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
    setDappMessage: (dappMessage) => dispatch(DappActions.setDappMessage(dappMessage)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatScreen)
