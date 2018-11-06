import React from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { GiftedChat } from 'react-native-gifted-chat';
import emojiUtils from 'emoji-utils';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

import SlackMessage from './chat/SlackMessage';
import AwesomeAlert from 'react-native-awesome-alerts';
import ActionSheet from 'react-native-actionsheet'
// import PopupDialog from '../Components/PopupDialog';
import Avatar from './chat/SlackAvatar';
import { Toast } from 'native-base';
import demoIcon from '../Images/democ1.png';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

import AmaCommands from '../Engine/misc/amaCommands.js'

import PopupDialog, {
  DialogTitle,
  SlideAnimation,
} from 'react-native-popup-dialog';
import { Container, Header, Content, Item, Form, Textarea } from 'native-base';
import { Button, Icon } from 'react-native-elements'

const slideAnimation = new SlideAnimation({ slideFrom: 'bottom' });

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
      // this.delegate = params.delegate
      this.delegate = true

      this.userId = props.userData.username
      this.amaCmds = new AmaCommands(this.userId, this.id)
      //
      // Prabhaav Prabhaav Prabhaav Prabhaav Prabhaav Prabhaav Prabhaav Prabhaav
      // Prabhaav to use this object, when a person does something like answer a
      // question, do the following:
      // const stringifiedCmd = this.amaCmds.answerCreate(<question_id>, 'This is the answer.')
      // const json = undefined
      // EngineActions.setOutgoingMessage(stringifiedCmd, json)

      // TODO: something better for this status/update hack
      this.fetchAmaData = false
      this.lastFetch = 0
    }
    this.state = {
      messages: [],
      showDialog: false,
      showAlert: false,
      alertMessage: '',
      alertTitle: '',
      alertOption: '',
      currentMessage: '',
      user: '',
      showAvatarAlert: false,
      amaAnswer: '',
      newContent: true,
    }
  }
  componentWillReceiveProps(nextProps) {
    // Not quite working--need to fix this:
    //  (temp workaround below is always update)
    // if (nextProps.amaStatus && this.fetchAmaData) {
    //   console.log(`amaStatus: ${JSON.stringify(nextProps.amaStatus)}`)
    //   if (this.lastFetch !== nextProps.amaStatus.updateTime) {
    //     this.fetchAmaData = false
    //     this.lastFetch = nextProps.amaStatus.updateTime
    //     this.props.sendAmaInfo(this.msgAddress, this.id)
    //   }
    // }
    //
    if (nextProps.amaStatus && nextProps.amaStatus.updateTime) {
      if (this.lastFetch !== nextProps.amaStatus.updateTime) {
        this.lastFetch = nextProps.amaStatus.updateTime
        this.props.sendAmaInfo(this.msgAddress, this.id)
      }
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
    const { text } = messages[0]
    const stringifiedCmd = this.amaCmds.questionCreate(text)
    this.fetchAmaData = true
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
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
  renderAvatar = (props) => {
    return (
      <Avatar
        {...props}
        questionUpvote={this.questionUpvote}
      />
    )
  }
  showActionSheet = (user) => {
    this.setState({ user })
    this.ActionSheet.show()
  }
  questionUpvote = (questionId) => {
    const stringifiedCmd = this.amaCmds.questionUpvote(questionId)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
  }
  onLongPress = (context, currentMessage) => {
    if (context) {
      if (currentMessage.answer) {
        const options = [
          'Delete Answer',
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
                showAlert: true,
                alertTitle: 'AMA Admin',
                alertMessage: 'Do you want to delete the answer?',
                alertOption: 'Delete',
                currentMessage
              })
              break;
          }
        });
      }
      else {
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
            case 0: {
              this.setState({
                currentMessage
              })
              this.slideAnimationDialog.show()
              break;
            }
            case 1:
              this.setState({
                showAlert: true,
                alertTitle: 'AMA Admin',
                alertMessage: 'Do you want to delete the question?',
                alertOption: 'Delete',
                currentMessage
              })
              break;
          }
        });
      }
    }
  }
  answerQuestion = (answer) => {
    const stringifiedCmd = this.amaCmds.answerCreate(this.state.currentMessage._id, answer)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
  }
  deleteQuestion = () => {
    const stringifiedCmd = this.amaCmds.questionDelete(this.state.currentMessage._id)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({showAlert: false})
  }
  deleteAnswer = () => {
    const stringifiedCmd = this.amaCmds.answerDelete(this.state.currentMessage._id)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({showAlert: false})
  }
  closeDialog = () => {
    this.setState({ showDialog: false })
  }
  handleUserActionSheet = (index) => {
    switch (index) {
      case 0: {
        const stringifiedCmd = this.amaCmds.userBlock(this.state.user.name)
        this.props.handleOutgoingMessage(stringifiedCmd, undefined);
        break;
      }
    }
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
        score: questionData.score,
        answer: false,
        user: {
          _id: questionData.question_id,
          name: questionData.question.author,
          avatar: '',
        }
      }
      amaMsgs.push(msg)
      for (const answer of questionData.answers) {
        const resp = {
          _id: answer.answer_id,
          text: answer.text,
          createdAt: Date.now(),
          answer: true,
          user: {
            _id: answer.answer_id,
            name: answer.author,
            avatar: demoIcon,
          }
        }
        amaMsgs.push(resp)
      }
    }
    amaMsgs.reverse()

    const {
      showAlert,
      user,
      showAvatarAlert,
      alertTitle,
      alertMessage,
      alertOption,
      showDialog,
      newContent,
    } = this.state
    const refreshButton = (newContent) ? (
      <Button
        raised
        color='green'
        buttonStyle={{backgroundColor: '#0364bf'}}
        textStyle={{ fontSize: 24, fontWeight: "900", color: "white"}}
        title='New Content Available'
        onPress={() => {this.setState({newContent: false}); alert('Content Refreshed')}}
        icon={{size: 28, type: 'font-awesome', name: 'bell', color: 'white'}}
      />
    ) : null
    if (showAlert) {
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
            if (this.state.currentMessage.answer)
              this.deleteAnswer()
            else
              this.deleteQuestion()
          }}
        />
      )
    }
    else if (showAvatarAlert) {
      return (
        <AwesomeAlert
          show={true}
          showProgress={false}
          title="Block User"
          message={`Do you want to block: ${user.name}`}
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={true}
          showCancelButton={true}
          showConfirmButton={true}
          cancelText="Cancel"
          confirmText="Block"
          cancelButtonColor="#DD6B55"
          confirmButtonColor="#34bbed"
          onCancelPressed={() => {
            this.setState({showAvatarAlert: false, user: ''})
          }}
          onConfirmPressed={() => {
            const stringifiedCmd = this.amaCmds.userBlock(user.name)
            this.props.handleOutgoingMessage(stringifiedCmd, undefined);
            this.setState({showAvatarAlert: false, user: ''})
          }}
        />
      )
    }
    return (
      <View style={{flex:1}}>
        <PopupDialog
          dialogTitle={<DialogTitle title="AMA Answer" />}
          ref={(popupDialog) => {
            this.slideAnimationDialog = popupDialog;
          }}
          dialogAnimation={slideAnimation}
          actions={[
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Button
                key="button-2"
                raised
                title='Close'
                leftIcon={{name: 'close'}}
                style={{paddingBottom: 20}}
                buttonStyle={{backgroundColor: '#DD6B55'}}
                onPress={() => {
                  this.slideAnimationDialog.dismiss();
                }}>
              </Button>,
              <Button
                key="button-1"
                raised
                title='Submit'
                leftIcon={{name: 'check'}}
                style={{paddingBottom: 20}}
                buttonStyle={{backgroundColor: '#34bbed'}}
                onPress={() => {
                  this.slideAnimationDialog.dismiss();
                  this.answerQuestion(this.state.amaAnswer)
                }}>
              </Button>
            </View>
          ]}
        >
          <Container>
            <Content padder>
              <Form>
                <Textarea onChangeText={(amaAnswer) => this.setState({amaAnswer})} rowSpan={5} bordered placeholder="Type AMA Answer..." />
              </Form>
            </Content>
          </Container>
        </PopupDialog>
        {/*<ActionSheet
          ref={o => this.ActionSheet = o}
          title={`Would you like to block the user?`}
          options={['Block', 'Cancel']}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          onPress={(this.delegate) ? (index) => this.handleUserActionSheet(index) : null}
        />*/}
        {/*{refreshButton}*/}
        <GiftedChat
          messages={amaMsgs}
          onSend={messages => this.onSend(messages)}
          user={{
            _id: this.userId
          }}
          placeholder='Ask a question...'
          onLongPress={(this.delegate) ? this.onLongPress : null}
          renderMessage={this.renderMessage}
          renderAvatar={this.renderAvatar}
          // onPressAvatar={(this.delegate) ? (user) => this.showActionSheet(user) : null}
          onPressAvatar={(this.delegate) ? (user) => {
            this.setState({showAvatarAlert: true, user})
          } : null}
        />
      </View>
    );
  }

}

const mapStateToProps = (state) => {
  return {
    userData: EngineSelectors.getUserData(state),
    amaData: EngineSelectors.getAmaData(state),
    amaStatus: EngineSelectors.getAmaStatus(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
    sendAmaInfo: (msgAddress, amaId) => dispatch(EngineActions.sendAmaInfo(msgAddress, amaId)),
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogContentView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationBar: {
    borderBottomColor: '#b5b5b5',
    borderBottomWidth: 0.5,
    backgroundColor: '#ffffff',
  },
  navigationTitle: {
    padding: 10,
  },
  navigationButton: {
    padding: 10,
  },
  navigationLeftButton: {
    paddingLeft: 20,
    paddingRight: 40,
  },
  navigator: {
    flex: 1,
    // backgroundColor: '#000000',
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SlackScreen)
