import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { GiftedChat } from 'react-native-gifted-chat';
import emojiUtils from 'emoji-utils';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

import SlackMessage from './chat/SlackMessage';
import Avatar from './chat/SlackAvatar';
import demoIcon from '../Images/democ1.png';

class SlackScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  };

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
    return (
      <GiftedChat
        messages={this.state.messages}
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
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SlackScreen)
