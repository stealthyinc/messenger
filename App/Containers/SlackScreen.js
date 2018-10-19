import React from 'react';
import { View, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { GiftedChat } from 'react-native-gifted-chat';
import emojiUtils from 'emoji-utils';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

import SlackMessage from './chat/SlackMessage';
import Avatar from './chat/SlackAvatar';
import demoIcon from '../Images/democ1.png';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

class SlackScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTitle: params.name,
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  };

  constructor(props) {
    super(props)
    if (props.navigation && props.navigation.state && props.navigation.state.params) {
      const params = props.navigation.state.params
      this.name = params.name
      this.id = params.id
      this.msgAddress = params.msgAddress
    }
  }

  state = {
    messages: [],
  }

  componentWillMount() {
    this.setState({
      messages: [
        {
          _id: 1,
          text: 'How does the VOTE token work?',
          createdAt: new Date(),
          user: {
            _id: 2,
            name: 'Alex',
            avatar: '',
          },
        },
        {
          _id: 3,
          text: 'You can use it to cast a vote in elections.',
          createdAt: new Date(),
          user: {
            _id: 4,
            name: 'Democracy Delegate',
            avatar: demoIcon,
          },
        },
      ].reverse(),
    })
    this.props.navigation.setParams({ navigation: this.props.navigation });
  }

  onSend(messages = []) {
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }))
    this.props.handleOutgoingMessage(undefined, messages[0])
  }

  renderMessage(props) {
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

  renderAvatar(props) {
    return (
      <Avatar {...props} />
    )
  }

  render() {
    console.log("AMA data in SlackScreen", this.props.amaData)
    if (!this.props.amaData)
      return (<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
              <ActivityIndicator size="large" color="#34bbed"/>
            </View>)

    // Convert AMA JSON to GC compat. JSON:
    const amaMsgs = []
    for (const questionData of this.props.amaData.ama) {
      const msg = {
        _id: questionData.question_id,
        text: questionData.question.text,
        createdAt: Date.now(),
        user: {
          _id: 1,
          name: questionData.question.author,
          avatar: '',
        }
      }
      amaMsgs.push(msg)
      for (const response of questionData.responses) {
        const resp = {
          _id: response.answer_id,
          text: response.text,
          createdAt: Date.now(),
          user: {
            _id: 2,
            name: response.author,
            avatar: demoIcon,
          }
        }
        amaMsgs.push(resp)
      }
    }
    amaMsgs.reverse()
    return (
      <GiftedChat
        messages={amaMsgs}
        onSend={messages => this.onSend(messages)}
        user={{
          _id: 1,
        }}
        renderMessage={this.renderMessage}
        renderAvatar={this.renderAvatar}
      />
    );
  }

}

const mapStateToProps = (state) => {
  return {
    amaData: EngineSelectors.getAmaData(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SlackScreen)
