import React, { Component } from 'react'
import { Image, Modal, Keyboard, StyleSheet, ScrollView, TouchableOpacity, View, Text, ActivityIndicator } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button } from 'react-native-elements'

import FileDrawer from './FileDrawer'

// Styles
import styles from './Styles/ChatStyle'
import {GiftedChat, Actions, Bubble, SystemMessage, InputToolbar} from 'react-native-gifted-chat';
import CustomView from './chat/CustomView';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import Communications from 'react-native-communications';
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const common = require('./../common.js');
const utils = require('./../Engine/misc/utils.js');

const { MESSAGE_STATE } = require('./../Engine/messaging/chatMessage.js');

class ChatScreen extends Component {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerTitle: params.name,
      headerRight: (
        // <TouchableOpacity onPress={() => console.log('cool')} style={{marginRight: 10}}>
        <TouchableOpacity onPress={() => params.navigation.navigate("DrawerOpen")} style={{marginRight: 10}}>
          <Ionicons name="ios-information-circle-outline" size={30} color='#037aff'/>
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
    };

    this._isMounted = false;
    this._isAlright = null;
    this.activeContact = undefined;
  }

  configWithActiveContact(anActiveContact) {
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
    
    const { messages } = nextProps
    if (this.props.messages && this.props.messages.length !== messages.length) {
      const numNewMsgs = messages.length - this.props.messages.length;
      let newMessages = [];
      for (const idx = messages.length-numNewMsgs; idx < messages.length; idx++) {
        const msg = messages[idx]
        const { author } = msg
        if (author !== this.state.author.username) {
          const { body, time, image } = msg
          const newMessage = {
            _id: Math.round(Math.random() * 1000000),
            text: body,
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
      const { author, body, time, image, state } = message
      const sent = (state === MESSAGE_STATE.SENT_OFFLINE || state === MESSAGE_STATE.SENT_REALTIME || state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      const received = (state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      if (author === id) {
        messages.push({
          _id: Math.round(Math.random() * 1000000),
          text: body,
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
          text: body,
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

  onSend = (messages = []) => {
    const { token } = this.state
    const { publicKey, bearerToken } = this.props
    if (token) {
      this.props.sendNotification(token, publicKey, bearerToken)
    }
    this.props.handleOutgoingMessage(messages[0].text);
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
        onPress={() => this.setModalVisible(true)}
      >
        <Modal
          animationType={'fade'}
          transparent={true}
          visible={this.state.modalVisible}
          onRequestClose={() => {
            this.setModalVisible(false);
          }}
        >
          <FileDrawer close={() => this.setModalVisible(false)} />
        </Modal>
        <Ionicons name="ios-attach" size={28} color='#037aff' />
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
              backgroundColor={'#037aff'}
              onPress={() => Communications.email([''],null,null,'Add me on Stealthy IM','')}
              icon={{name: 'email', color: 'white'}}
              title='Email'
              raised
            />
            <View style={{margin: 10}} />
            <Button 
              backgroundColor={'#037aff'}
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
          // renderActions={this.renderCustomActions}
          renderBubble={this.renderBubble}
          renderSystemMessage={this.renderSystemMessage}
          renderCustomView={this.renderCustomView}
          renderFooter={this.renderFooter}
          renderInputToolbar={this.renderInputToolbar} 
        />)
      :
        (<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
          <ActivityIndicator size="large" color="#34bbed" />
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
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (message) => dispatch(EngineActions.setOutgoingMessage(message)),
    sendNotification: (token, publicKey, bearerToken) => dispatch(EngineActions.sendNotification(token, publicKey, bearerToken)),
    handleContactClick: () => dispatch(EngineActions.setActiveContact(undefined)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatScreen)
