import React, { Component } from 'react'
import { Button, Platform, ScrollView, TouchableOpacity, View, Text } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

// Styles
import styles from './Styles/ChatStyle'
import {GiftedChat, Actions, Bubble, SystemMessage} from 'react-native-gifted-chat';
import CustomActions from './chat/CustomActions';
import CustomView from './chat/CustomView';
import firebase from 'react-native-firebase';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

class ChatScreen extends Component {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerTitle: params.name,
      headerRight: (
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
      loadEarlier: true,
      typingText: null,
      isLoadingEarlier: false,
      activeContact: null,
    };

    this._isMounted = false;
    this.onSend = this.onSend.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.renderCustomActions = this.renderCustomActions.bind(this);
    this.renderBubble = this.renderBubble.bind(this);
    this.renderSystemMessage = this.renderSystemMessage.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.onLoadEarlier = this.onLoadEarlier.bind(this);

    this._isAlright = null;
  }

  componentWillMount() {
    this._isMounted = true;
    const { contactMgr, userData, userProfile } = this.props
    const { username } = userData
    const { profile } = userProfile
    const { name, image } = profile
    let userImage = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
    if (image[0]) {
      userImage = image[0].contentUrl
    }
    this.state.author = {
      username,
      name,
      userImage
    }
    let activeContact
    if (contactMgr) {
      activeContact = contactMgr.getActiveContact();
    }
    this.state.activeContact = activeContact
    this.props.navigation.setParams({ navigation: this.props.navigation, name: activeContact.description ? activeContact.description : activeContact.id });
    const { messages } = this.props;
    if (messages) {
      this.state.messages = this.setupMessages(messages).reverse();
    }
  }

  componentWillReceiveProps(nextProps) {
    const { messages } = nextProps
    if (this.props.messages.length !== messages.length) {
      const msg = messages[messages.length-1]
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
        this.onReceive(newMessage)
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  setupMessages = (inputMessages) => {
    let messages = []
    const { description, id } = this.state.activeContact
    for (const message of inputMessages) {
      const { author, body, time, image, seen } = message
      if (message.author === id) {
        messages.push({
          _id: Math.round(Math.random() * 1000000),
          text: body,
          createdAt: time,
          sent: true,
          received: seen,
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
          sent: seen,
          received: seen,
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

  onLoadEarlier() {
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

  onSend(messages = []) {
    //pbj pk.txt: 0231debdb29c8761a215619b2679991a1db8006c953d1fa554de32e700fe89feb9
    //ayc pk.txt: 0363cd66f87eec2e0fc2a4bc9b8314f5fd0c2a18ce1c6a7d31f1efec83253d46a2
    // const senderId  = "alexc.id"
    // const time      = Date.now()
    // const read      = false
    // const sender    = "0363cd66f87eec2e0fc2a4bc9b8314f5fd0c2a18ce1c6a7d31f1efec83253d46a2"
    // const recepient = "0231debdb29c8761a215619b2679991a1db8006c953d1fa554de32e700fe89feb9"
    // const npath = `/global/notifications/${recepient}/`
    // firebase.database().ref(npath).push({
    //   read,
    //   time,
    //   sender,
    //   senderId,
    // })
    // process for sending a notification
    // - check fb under /global/notifications/senderPK
    // - decrypt data and look up receiver's user device token
    // - send a request to fb server to notify the person of a new message
    // - curl --header "Content-Type: application/json" \
    //   --header "Authorization: key=fb_server_key" \
    //   https://fcm.googleapis.com/fcm/send \
    //   -d '{"notification": {"title": "New Message", "sound": "default"},
    //   "priority": "high",
    //   "to": "user_device_token"}'

    // An example showing how to send a message
    // TODO: PBJ delete me and integrate with the messages editor / editbox
    // const currDate = new Date();
    // const aMessage = `I was sent automatically after me-initialized [${currDate.getHours()}:${currDate.getMinutes()}:${currDate.getSeconds()}].`;
    this.props.handleOutgoingMessage(messages[0].text);
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, messages),
      };
    });
  }

  onReceive(newMessage) {
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, newMessage),
      };
    });
  }

  renderCustomActions(props) {
    if (Platform.OS === 'ios') {
      return (
        <CustomActions
          {...props}
        />
      );
    }
    const options = {
      'Action 1': (props) => {
        alert('option 1');
      },
      'Action 2': (props) => {
        alert('option 2');
      },
      'Cancel': () => {},
    };
    return (
      <Actions
        {...props}
        options={options}
      />
    );
  }

  renderBubble(props) {
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

  renderSystemMessage(props) {
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

  renderCustomView(props) {
    return (
      <CustomView
        {...props}
      />
    );
  }

  renderFooter(props) {
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

  render() {
    return (
      <GiftedChat
        style={{backgroundColor: 'white'}}
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
      />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    userData: EngineSelectors.getUserData(state),
    userProfile: EngineSelectors.getUserProfile(state),
    messages: EngineSelectors.getMessages(state),
    contactMgr: EngineSelectors.getContactMgr(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (message) => dispatch(EngineActions.setOutgoingMessage(message)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatScreen)
