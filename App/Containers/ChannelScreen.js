import React, { Component } from 'react'
import { TextInput, Dimensions, Keyboard, Platform, Image, Modal, StyleSheet, ScrollView, TouchableOpacity, TouchableHighlight, WebView, View, Text, ActivityIndicator } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button, Icon } from 'react-native-elements'
import Drawer from 'react-native-drawer'
import ControlPanel from './ControlPanel'

import AmaCommands from '../Engine/misc/amaCommands.js'

import PopupDialog, {
  DialogTitle,
  DialogButton,
  SlideAnimation,
} from 'react-native-popup-dialog';
import { Container, Header, Content, Item, Form, Textarea, Toast } from 'native-base';

// Styles
import ActionSheet from 'react-native-actionsheet'
import emojiUtils from 'emoji-utils';
import SlackMessage from './chat/SlackMessage';
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
const slideAnimation = new SlideAnimation({ slideFrom: 'bottom' });
const { width, height } = Dimensions.get('window')

class ChannelScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTitle: params.name,
      headerRight: (
        // <TouchableOpacity onPress={() => console.log('cool')} style={{marginRight: 10}}>
        <TouchableOpacity onPress={() => alert('Public Unencrypted Channels')} style={{marginRight: 10}}>
          <Ionicons name="ios-help-buoy" size={28} color='white'/>
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
      inputText: '',
      user: '',
      visible: false
    };

    this._isMounted = false;
    this._isAlright = null;
    this.activeContact = undefined;
    this.publicKey = undefined
    this.displayname = ''
    this.delegate = false

    // Stores AMA id values for each
    // AMA title (used to pass id in for navigation):
    //
    this.amaTitleIndex = {}
  }
  configWithActiveContact = (anActiveContact, administrable=false, force=false, callSetState=false) => {
    const method = 'ChannelScreen::configWithActiveContact'
    console.log(`INFO(${method}): anActiveContact=${anActiveContact}`)

    if ((this.activeContact && !force) || !anActiveContact) {
      return
    }

    this.delegate = administrable

    console.log(`INFO(${method}): anActiveContact.id=${anActiveContact.id}`)

    this.activeContact = anActiveContact
    this.publicKey = (this.activeContact) ? this.activeContact.publicKey : undefined
    this.isAma = utils.isAma(this.activeContact.protocol)
    this.protocol = (this.activeContact) ?
      utils.isChannelOrAma(this.activeContact.protocol) : false
    console.log(`DEBUG(${method}): this.protocol = ${this.protocol}, this.activeContact.protocol = ${this.activeContact.protocol}.`)
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
    //user added to the channel notification topic
    // firebaseInstance.subscribeToTopic(username);
    const { contactMgr } = this.props
    const activeContact = (contactMgr && contactMgr.getActiveContact()) ?
      contactMgr.getActiveContact() : undefined
    const administrable = (activeContact && contactMgr.isAdministrable(activeContact.id)) ? true : false
    if (activeContact) {
      this.configWithActiveContact(activeContact, administrable)
      // firebaseInstance.subscribeToTopic(activeContact.id);
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
    if (this.props.messages && this.props.messages.length !== messages.length) {
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
        const { author, image } = msg
        if (author !== this.state.author.username) {
          const { url, gimage, text, time } = this.parseJargon(msg)
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
  parseJargon = (message) => {
    const { body, time, image, contentType } = message
    let url, gimage, text
    if (contentType === 'TEXT') {
      text = body
      url = ''
      gimage = ''
    }
    else if (contentType === 'TEXT_JSON') {
      text = body.text
      //
      // Handle AMA message objects
      if (body.type === 'public ama 1.0') {
        text = body.title + '\n' +
               '\n' +
               '(' + body.status + ')'
        this.amaTitleIndex[body.title] = {
          id: body.ama_id,
          msgAddress: message.msgAddress,
        }
        this.state.amaTitle = body.title
      }
      //
      url = body.url
      gimage = body.image
    }
    return { url, gimage, text, time }
  }
  setupMessages = (inputMessages) => {
    let messages = []
    let { description, id } = this.activeContact
    for (const message of inputMessages) {
      const { author, body, image, state, contentType } = message
      const sent = (state === MESSAGE_STATE.SENT_OFFLINE || state === MESSAGE_STATE.SENT_REALTIME || state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      const received = (state === MESSAGE_STATE.SEEN || state === MESSAGE_STATE.RECEIVED)
      const { url, gimage, text, time } = this.parseJargon(message)
      if (author === id) {
        if (this.protocol) {
          const newText = text
          const index = newText.indexOf(' says: ')
          author = newText.substring(0, index)
          if (author) {
            text = newText.substring(index+7)
            if (this.protocol)
              image = ''
            name = ''
            description = author
          }
        }
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
    // if (token) {
    //   this.props.sendNotification(token, publicKey, bearerToken)
    // }
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
    //hack to show the generated id instead of stealthy all the time
    let updatedMessages = []
    if (this.protocol) {
      for (let message of newMessages) {
        let {text, user, createdAt, _id} = message
        const index = text.indexOf(' says: ')
        let newId = ''
        let newText = text
        if (index > -1) {
          newId = text.substring(0, index)
          newText = text.substring(index+7)
          user.avatar = ''
          user.name = newId
          user._id = newId
        }
        let crap = {
          user,
          text: newText,
          createdAt,
          _id,
        }
        updatedMessages.push(crap)
      }
    }
    else {
      updatedMessages = newMessages
    }
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, updatedMessages),
      };
    });
  }
  renderCustomActions = (props) => {
    return (this.isAma) ? (
      <TouchableOpacity
        style={[styles.chatContainer, this.props.containerStyle]}
        onPress={() => {
          this.setState({visible: true})
        }}
      >
        <Ionicons name="ios-radio" size={28} color='#34bbed' />
      </TouchableOpacity>
    ) : null
    //disabling this for v1.7
    // (
    //   <TouchableOpacity
    //     style={[styles.chatContainer, this.props.containerStyle]}
    //     onPress={() => this.toggleDrawer()}
    //   >
    //     <Ionicons name="ios-compass" size={28} color='#34bbed' />
    //   </TouchableOpacity>
    // )
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
  onPressAma = (amaname) => {
    if (amaname) {
      // Strip out anything after the first linefeed ('\n'):
      const amaNameFirstLineMatch = amaname.match(/[^\n]*/)
      if (amaNameFirstLineMatch.length >= 1) {
        const amaNameFirstLine = amaNameFirstLineMatch[0]
        const idInformation = this.amaTitleIndex[amaNameFirstLine]
        const id = (idInformation) ? idInformation.id : undefined
        const msgAddress = (idInformation) ? idInformation.msgAddress : undefined
        this.props.navigation.navigate('SlackScreen',
          {
            name: amaNameFirstLine,
            id,
            msgAddress,
            delegate: this.delegate
          })
        this.props.sendAmaInfo(msgAddress, id, this.activeContact.id)
      }
    }
  }
  toggleDrawer = () => {
    if (this.state.drawerOpen)
      this.closeDrawer()
    else
      this.openDrawer()
  };
  closeDrawer = () => {
    this._drawer.close()
    this._giftedChat.textInput.focus()
  };
  openDrawer = () => {
    this._drawer.open()
    this._giftedChat.textInput.focus()
  };
  setCustomText = (inputText) => {
    //turning this off for v1.7
    // if (this.protocol && inputText && (inputText[0] === '@' || inputText[0] === '/') && inputText.length < 2) {
    //   this.openDrawer()
    // }
    this.setState({inputText})
  }
  addToInput = (text) => {
    const newText = this.state.inputText + text
    this.setState({inputText: newText})
    this.closeDrawer()
  }
  renderMessage = (props) => {
    const { currentMessage: { text: currText } } = props;
    let messageTextStyle;
    // Make "pure emoji" messages much bigger than plain text.
    if (currText && emojiUtils.isPureEmojiString(currText)) {
      messageTextStyle = {
        fontSize: 28,
        // Emoji get clipped if lineHeight isn't increased; make it consistent across platforms.
        lineHeight: Platform.OS === 'android' ? 34 : 30,
      };
    }
    return (
      <SlackMessage {...props} messageTextStyle={messageTextStyle} />
    );
  }
  handleUserActionSheet = (index) => {
    switch (index) {
      case 0: {
        this.props.addContactId(this.state.user.name)
        break;
      }
    }
  }
  showActionSheet = (user) => {
    this.setState({ user })
    this.ActionSheet.show()
  }
  // renderBubble = (props) => {
  //   return (
  //     <Bubble
  //       {...props}
  //       wrapperStyle={{
  //         left: {
  //           backgroundColor: '#f0f0f0',
  //         }
  //       }}
  //     />
  //   );
  // }
  render() {
    const amaButton = (this.amaTitleIndex[this.state.amaTitle]) ? (
      <Button
        raised
        color='green'
        buttonStyle={{backgroundColor: '#b37ccf'}}
        textStyle={{ fontSize: 24, fontWeight: "900", color: "white"}}
        title={this.state.amaTitle}
        onPress={() => this.onPressAma(this.state.amaTitle)}
        icon={{size: 28, type: 'font-awesome', name: 'bullhorn', color: 'white'}}
      />
    ) : null
    const disableAmaFeatures = this.isAma && !this.delegate
    return (
      <View id='GiftedChatContainer'
           style={{flex: 1,
                   backgroundColor: 'white'}}>
        <PopupDialog
          dialogKey="goWay"
          height={0.4}
          width={0.9}
          dialogStyle={{
            top: -1 * (width / 3),
            borderRadius: 20,
            padding: 10,
            overflow: 'hidden',
          }}
          dialogTitle={<DialogTitle key='dpdialog' align="left" title="Set your AMA Topic" />}
          visible={this.state.visible}
          dialogAnimation={slideAnimation}
          actions={[
            <DialogButton
              key="button-2"
              text='Close'
              align='left'
              bordered={true}
              style={{paddingBottom: 20, backgroundColor: '#DD6B55'}}
              textStyle={{color: 'white'}}
              onPress={() => {
                this.setState({visible: false})
                Keyboard.dismiss()
              }}>
            </DialogButton>,
            <DialogButton
              key="button-1"
              text='Submit'
              align='right'
              bordered={true}
              style={{paddingBottom: 20, backgroundColor: '#34bbed'}}
              textStyle={{color: 'white'}}
              onPress={() => {
                if (this.state.amaAnswer) {
                  this.setState({visible: false})
                  Keyboard.dismiss()
                  const stringifiedCmd = AmaCommands.amaCreate(this.state.amaAnswer)
                  this.props.handleOutgoingMessage(stringifiedCmd, undefined);
                  this.setState({amaTitle: this.state.amaAnswer, amaAnswer: ''})
                  this.props.setSpinnerData(true, 'Processing...')
                  setTimeout(() => {
                    this.props.setSpinnerData(false, '')
                  }, 3000);
                }
              }}>
            </DialogButton>
          ]}
        >
          <Container>
            <Content padder>
              <Form>
                <Textarea
                  rowSpan={7}
                  onChangeText={(amaAnswer) => this.setState({amaAnswer: `AMA: ${amaAnswer}`})}
                  bordered
                  placeholder="Enter a AMA Topic"
                />
              </Form>
            </Content>
          </Container>
        </PopupDialog>
        {amaButton}
        <ActionSheet
          ref={o => this.ActionSheet = o}
          title={`Would you like to add this user?`}
          options={['Add', 'Cancel']}
          cancelButtonIndex={1}
          destructiveButtonIndex={1}
          onPress={(index) => this.handleUserActionSheet(index)}
        />
        <GiftedChat
          ref={(ref) => this._giftedChat = ref}
          messages={this.state.messages}
          onSend={this.onSend}
          loadEarlier={this.state.loadEarlier}
          onLoadEarlier={this.onLoadEarlier}
          onPressAvatar={(this.protocol) ? (user) => this.showActionSheet(user)
           : () => this.props.navigation.navigate('ContactProfile')}
          isLoadingEarlier={this.state.isLoadingEarlier}
          user={{
            _id: this.state.author.username, // sent messages should have same user._id
          }}
          showAvatarForEveryMessage={true}
          renderAvatarOnTop={true}
          text={this.state.inputText}
          renderBubble={this.renderBubble}
          renderActions={(!disableAmaFeatures) ? this.renderCustomActions : null}
          renderMessage={this.renderMessage}
          renderFooter={this.renderFooter}
          maxInputLength={240}
          renderInputToolbar={this.renderInputToolbar}
          parsePatterns={(linkStyle) => [
            { pattern: /AMA:.*\n\n.*/, style: linkStyle, onPress: this.onPressAma },
          ]}
          onInputTextChanged={text => this.setCustomText(text)}
          textInputProps={{editable: (!disableAmaFeatures)}}
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
    addContactId: (id) => dispatch(EngineActions.addContactId(id)),
    shareInit: () => dispatch(TwitterShareActions.shareInit()),
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
    sendAmaInfo: (msgAddress, amaId, amaUserId) => dispatch(EngineActions.sendAmaInfo(msgAddress, amaId, amaUserId)),
    sendNotification: (token, publicKey, bearerToken) => dispatch(EngineActions.sendNotification(token, publicKey, bearerToken)),
    handleContactClick: () => dispatch(EngineActions.setActiveContact(undefined)),
    updateContactPubKey: (aContactId) => dispatch(EngineActions.updateContactPubKey(aContactId)),
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
    setDappMessage: (dappMessage) => dispatch(DappActions.setDappMessage(dappMessage)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelScreen)
