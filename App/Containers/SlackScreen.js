import React from 'react';
import { TextInput, Dimensions, Keyboard, View, Text, TouchableOpacity, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { GiftedChat } from 'react-native-gifted-chat';
import emojiUtils from 'emoji-utils';
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';

import SlackMessage from './chat/SlackMessage';
import AwesomeAlert from 'react-native-awesome-alerts';
// import PopupDialog from '../Components/PopupDialog';
import Avatar from './chat/SlackAvatar';
import { Toast } from 'native-base';
import demoIcon from '../Images/democ1.png';
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

import AmaCommands from '../Engine/misc/amaCommands.js'

import PopupDialog, {
  DialogTitle,
  DialogButton,
  SlideAnimation,
} from 'react-native-popup-dialog';
import { Container, Header, Content, Item, Form, Textarea } from 'native-base';
import { Button, Icon } from 'react-native-elements'
import { shareOnTwitter } from 'react-native-social-share';

const slideAnimation = new SlideAnimation({ slideFrom: 'bottom' });
const { width, height } = Dimensions.get('window')

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
      this.delegate = params.delegate
      // this.delegate = true

      this.userId = props.userData.username
      this.amaUserId = props.amaStatus.contactId
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
      visible: false
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
    //     this.props.sendAmaInfo(this.msgAddress, this.id, this.userId)
    //   }
    // }
    //
    if (nextProps.amaStatus && nextProps.amaStatus.updateTime) {
      if (this.lastFetch !== nextProps.amaStatus.updateTime) {
        this.lastFetch = nextProps.amaStatus.updateTime
        this.props.sendAmaInfo(this.msgAddress, this.id, this.amaUserId)
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
  processMessage() {
    this.props.setSpinnerData(true, 'Processing...')
    setTimeout(() => {
      this.props.setSpinnerData(false, '')
    }, 3000);
  }
  onSend(messages = []) {
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }))
    this.processMessage()
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
        upvoteRegistered={this.upvoteRegistered}
      />
    )
  }
  upvoteRegistered = (questionId) => {
    for (const questionData of this.props.amaData.ama) {
      // this is what i'm looking for
      const { question_id, voted } = questionData
      if (question_id === questionId) {
        if (!voted)
          return false
        return voted
      }
    }    
  }
  questionUpvote = (questionId) => {
    const stringifiedCmd = this.amaCmds.questionUpvote(questionId)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.processMessage()
  }
  onLongPress = (context, currentMessage) => {
    if (context) {
      const tweetText = `"${currentMessage.text}" by ${currentMessage.user.name} in ${this.name}. Join the AMA at www.stealthy.im`
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
        if (this.delegate) {
          const options = [
            'Answer Question',
            'Tweet Question',
            'Pin Question',
            'Unpin Questin',
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
                this.setState({visible: true})
                break;
              }
              case 1: {
                shareOnTwitter({
                    'text': tweetText,
                  },
                  (results) => {
                    console.log(results);
                    if (results === "not_available") {
                      alert ("Twitter not found on your device")
                    }
                  }
                )
                break;
              }
              case 2: {
                const stringifiedCmd = this.amaCmds.questionPin(currentMessage._id)
                this.props.handleOutgoingMessage(stringifiedCmd, undefined);
                this.processMessage()
                break
              }
              case 3: {
                const stringifiedCmd = this.amaCmds.questionUnpin(currentMessage._id)
                this.props.handleOutgoingMessage(stringifiedCmd, undefined);
                this.processMessage()
                break
              }
              case 4:
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
        else {
          const options = [
            'Tweet Question',
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
                shareOnTwitter({
                    'text': tweetText,
                  },
                  (results) => {
                    console.log(results);
                  }
                )
                break;
              }
            }
          });
        }
      }
    }
  }
  answerQuestion = (answer) => {
    const stringifiedCmd = this.amaCmds.answerCreate(this.state.currentMessage._id, answer)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({amaAnswer: ''})
    this.processMessage()
  }
  deleteQuestion = () => {
    const stringifiedCmd = this.amaCmds.questionDelete(this.state.currentMessage._id)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({showAlert: false})
    this.processMessage()
  }
  deleteAnswer = () => {
    const stringifiedCmd = this.amaCmds.answerDelete(this.state.currentMessage._id)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({showAlert: false})
    this.processMessage()
  }
  blockUser = () => {
    const stringifiedCmd = this.amaCmds.userBlock(this.state.user.name)
    this.props.handleOutgoingMessage(stringifiedCmd, undefined);
    this.setState({showAvatarAlert: false, user: ''})
    this.processMessage()
  }
  closeDialog = () => {
    this.setState({ showDialog: false })
  }
  onPressUrl = (url) => {
    this.props.setDappUrl(url)
    this.props.navigation.navigate('DappScreen')
  }
  render() {
    if (!this.props.amaData)
      return (<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} >
              <ActivityIndicator size="large" color="#34bbed"/>
            </View>)

    // Convert AMA JSON to GC compat. JSON:
    const amaMsgs = []
    if (this.props.amaData.ama) {
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
    }
    const {
      showAlert,
      user,
      showAvatarAlert,
      alertTitle,
      alertMessage,
      alertOption,
      showDialog,
      newContent,
      visible
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
          parsePatterns={(linkStyle) => [
            { type: 'url', style: linkStyle, onPress: this.onPressUrl },
          ]}
          onConfirmPressed={() => this.blockUser()}
        />
      )
    }
    return (
      <View style={{flex:1}}>
        <PopupDialog
          height={0.4}
          width={1}
          dialogStyle={{
            top: -1 * (width / 3),
            borderRadius: 20,
            padding: 10,
            overflow: 'hidden',
          }}
          visible={visible}
          dialogTitle={<DialogTitle title="AMA Answer" />}
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
                  this.answerQuestion(this.state.amaAnswer)
                  Keyboard.dismiss()
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
                  onChangeText={(amaAnswer) => this.setState({amaAnswer})}
                  bordered
                  placeholder="Type AMA Answer..."
                />
              </Form>
            </Content>
          </Container>
        </PopupDialog>
        {/*{refreshButton}*/}
        <GiftedChat
          messages={amaMsgs}
          onSend={messages => this.onSend(messages)}
          user={{
            _id: this.userId
          }}
          placeholder='Ask a question...'
          onLongPress={this.onLongPress}
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
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
    handleOutgoingMessage: (text, json) => dispatch(EngineActions.setOutgoingMessage(text, json)),
    sendAmaInfo: (msgAddress, amaId, amaUserId) => dispatch(EngineActions.sendAmaInfo(msgAddress, amaId, amaUserId)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message)),
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
