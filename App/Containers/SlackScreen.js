import React from 'react';
import { View, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { GiftedChat } from 'react-native-gifted-chat';
import emojiUtils from 'emoji-utils';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

import SlackMessage from './chat/SlackMessage';
import AwesomeAlert from 'react-native-awesome-alerts';
import ActionSheet from 'react-native-actionsheet'
import PopupDialog from '../Components/PopupDialog';
import Avatar from './chat/SlackAvatar';
import { Toast } from 'native-base';
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
    this.state = { 
      messages: [],
      showDialog: false,
      showAlert: false,
      alertMessage: '',
      alertTitle: '',
      alertOption: ''
    }
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
    const {text, gtext, image, url} = messages[0]
    this.props.handleOutgoingMessage(text, undefined);
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
  showActionSheet = () => {
    this.ActionSheet.show()
  }
  onLongPress = (context) => {
    if (context) {
      const options = [
        'Answer Question',
        'Delete Question',
        'Cancel',
      ];
      const destructiveButtonIndex = options.length - 1;
      context.actionSheet().showActionSheetWithOptions({
        options,
        destructiveButtonIndex,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 0:
            this.setState({
              showDialog: true,
            })
            break;
          case 1:
            this.setState({
              showAlert: true,
              alertTitle: 'AMA Admin',
              alertMessage: 'Do you want to delete the question?',
              alertOption: 'Delete'
            })
            break;
        }
      });
    }
  }
  closeDialog = () => {
    this.setState({ showDialog: false })
  }
  render() {
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
          _id: questionData.question_id,
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
            _id: response.answer_id,
            name: response.author,
            avatar: demoIcon,
          }
        }
        amaMsgs.push(resp)
      }
    }
    amaMsgs.reverse()
    //TODO: need to feed the id of the current user
    this.user = 'pbj.id'
    //TODO: need to determine if user is a delegate/admin
    this.delegate = true
    const { 
      showAlert, 
      alertTitle, 
      alertMessage, 
      alertOption, 
      showDialog 
    } = this.state
    if (showDialog) {
      return (
        <PopupDialog 
          closeDialog={this.closeDialog}
        />
      )
    }
    else if (showAlert) {
      return (
        <AwesomeAlert
          show={true}
          showProgress={false}
          title={alertTitle}
          message={alertMessage}
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={true}
          showCancelButton={true}
          showConfirmButton={true}
          cancelText="Cancel"
          confirmText={alertOption}
          cancelButtonColor="#DD6B55"
          confirmButtonColor="#34bbed"
          onCancelPressed={() => {
            this.setState({showAlert: false})
          }}
          onConfirmPressed={() => {
            this.setState({showAlert: false})
          }}
        />
      )
    }
    return (
      <View style={{flex:1}}>
        <ActionSheet
          ref={o => this.ActionSheet = o}
          title={'Would you like to delete the user?'}
          options={['Delete', 'Cancel']}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          onPress={(index) => { /* do something */ }}
        />
        <GiftedChat
          messages={amaMsgs}
          onSend={messages => this.onSend(messages)}
          user={{
            _id: this.user
          }}
          placeholder='Ask a question...'
          onLongPress={(this.delegate) ? this.onLongPress : null}
          renderMessage={this.renderMessage}
          renderAvatar={this.renderAvatar}
          onPressAvatar={(this.delegate) ? (user) => this.showActionSheet(user) : null}
        />
      </View>
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
