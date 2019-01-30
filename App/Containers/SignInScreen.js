import React from 'react'
import {
  AsyncStorage,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Linking,
  NativeModules
} from 'react-native'
import { Button, SocialIcon } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import chatIcon from '../Images/blue512.png'
import AwesomeAlert from 'react-native-awesome-alerts'
import VersionNumber from 'react-native-version-number'
import { copilot, walkthroughable, CopilotStep } from '@okgrow/react-native-copilot'
import Icon from 'react-native-vector-icons/FontAwesome';

const utils = require('./../Engine/misc/utils.js')
const { firebaseInstance } = require('../Engine/firebaseWrapper.js')

const WalkthroughableText = walkthroughable(Text);

class SignInScreen extends React.Component {
  static navigationOptions = {
    header: null
  };
  constructor (props) {
    super(props)
    this.state = {
      error: false,
      errorText: ''
    }
    this.props.setSpinnerData(false, '')
  }
  componentDidMount() {
    this.props.copilotEvents.on('stepChange', this.handleStepChange);
  }
  handleStepChange = (step) => {
    console.log(`Current step is: ${step.name}`);
  }
  render () {
    const oldPad = utils.is_oldPad()
    const marginBottom = 50
    if (this.state.error) {
      return (
        <AwesomeAlert
          show={this.state.error}
          showProgress={false}
          title='Stealthy Error'
          message={this.state.errorText}
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={false}
          showCancelButton
          showConfirmButton
          cancelText='Close'
          cancelButtonColor='#DD6B55'
          confirmText='More Info'
          confirmButtonColor='#34bbed'
          onCancelPressed={() => {
            this.setState({error: false, errorText: ''})
          }}
          onConfirmPressed={() => Linking.openURL('https://www.stealthy.im/badIdError1.jpg').catch(err => console.error('An error occurred', err))}
          />
      )
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{flexDirection: 'row',
                      marginTop: 40,
                      justifyContent: 'space-between',
                      alignItems: 'stretch',
                      width: '100%'}}>

          <View
            style={{flex: 0.05}}/>

          <CopilotStep text="Follow us on Twitter to keep up with the latest updates" order={6} name="twitter"
                       style={{justifyContent: 'flex-start'}}>
            <WalkthroughableText style={styles.title}>
              <Icon
                size={40} 
                name='twitter'
                color='#38A1F3'
                onPress={() => Linking.openURL('https://twitter.com/stealthyim').catch(err => console.error('An error occurred', err))}
              />
            </WalkthroughableText>
          </CopilotStep>

          <View
            style={{flex: 0.05}}/>

          <CopilotStep text="Read about our Product Hunt mobile launch" order={5} name="product-hunt"
                       style={{justifyContent: 'flex-start'}}>
            <WalkthroughableText style={styles.title}>
              <Icon
                size={40} 
                name='product-hunt'
                color='#da552f'
                onPress={() => Linking.openURL('https://www.producthunt.com/posts/stealthy-im').catch(err => console.error('An error occurred', err))}
              />
            </WalkthroughableText>
          </CopilotStep>

          <View
            style={{flex: 0.90}}/>

          <CopilotStep text="Read our engineering blog about the underlying technology of Stealthy" order={4} name="medium"
                       style={{justifyContent: 'flex-end'}}>
            <WalkthroughableText style={styles.title}>
              <Icon
                size={40} 
                name='medium'
                color='#00ab6c'
                onPress={() => Linking.openURL('https://medium.com/@stealthyim').catch(err => console.error('An error occurred', err))}
              />
            </WalkthroughableText>
          </CopilotStep>

          <View
            style={{flex: 0.05}}/>

          <CopilotStep text="You can watch a video to learn about the features" order={3} name="youtube"
                       style={{justifyContent: 'flex-end'}}>
            <WalkthroughableText style={styles.title}>
              <Icon
                size={40} 
                name='youtube-play'
                color='#ED3833'
                onPress={() => Linking.openURL('https://www.youtube.com/watch?v=4rLdMIrVBrw').catch(err => console.error('An error occurred', err))}
              />
            </WalkthroughableText>
          </CopilotStep>

          <View
            style={{flex: 0.05}}/>

        </View>
        <View style={{flexDirection: 'row', marginTop: (oldPad) ? 50 : 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: (oldPad) ? 50 : 80, marginTop: 5 }}>Hi Stealthy 👋</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: (oldPad) ? 20 : 24, color: 'grey', marginBottom }}>Decentralized Communication</Text>
        <CopilotStep text="Hey! Welcome to the tour! Click here to create an account or login" order={1} name="createAccount">
          <WalkthroughableText style={styles.title}>
            <Button
              onPress={this._signInAsync}
              title='Sign In/Up'
              titleStyle={{ fontSize: 18, fontWeight: '900', color: 'white' }}
              icon={{name: 'input', color: 'white'}}
              buttonStyle={{
                backgroundColor: '#34bbed',
                width: 180,
                height: 50,
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 5,
                marginTop: (oldPad) ? 10 : 25
              }}
            />
          </WalkthroughableText>
        </CopilotStep>
        <Button
          onPress={() => this.props.start()}
          title='Walk Through'
          titleStyle={{ fontSize: 18, fontWeight: '900', color: 'black' }}
          icon={{name: 'help', color: 'black'}}
          buttonStyle={{
            backgroundColor: 'white',
            width: 180,
            height: 50,
            borderColor: 'black',
            borderWidth: 2,
            borderRadius: 5,
            marginTop: (oldPad) ? 10 : 25
          }}
        />
      </ScrollView>
    )
  }
  // iOS specific (possibly works on web too)
  _getUserData = async () => {
    const {BlockstackNativeModule} = NativeModules
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        // throw(`Failed to get user data.  ${error}`);
        // this.props.setEngineFault(true)
        this.setState({error: true, errorText: 'User data not found. Please ensure you have a valid Blockstack username. E-mail support@stealthy.im for further help.'})
        this.props.setSignInPending(false)
        this.props.setSpinnerData(false, '')
      } else {
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], async (error, publicKey) => {
            if (error) {
              // throw(`Failed to get public key from private. ${error}`);
              // this.props.setEngineFault(true)
              this.setState({error: true, errorText: 'Failed to get public key from private.'})
              this.props.setSignInPending(false)
              this.props.setSpinnerData(false, '')
            } else {
              userData['appPublicKey'] = publicKey
              AsyncStorage.setItem('userData', JSON.stringify(userData))
              this.props.screenProps.authWork(userData)
              AsyncStorage.setItem('appVersion', JSON.stringify(VersionNumber.appVersion))
            }
          })
      }
    })
  };
  _getChannelsData = async () => {
    let channels = {}
    firebaseInstance.getFirebaseRef('/global/public_channel_v2_0/auto').once('value')
    .then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const name = childSnapshot.key
        const channel = childSnapshot.val()
        if (channel.hasOwnProperty('title') &&
            channel.hasOwnProperty('description') &&
            channel.hasOwnProperty('base64')) {
          channels[name] = channel
        }
      })
      AsyncStorage.setItem('channels', JSON.stringify(channels))
      this.props.setChannelsData(channels)
    })
  }
  _signInAsync = async () => {
    this.props.setSpinnerData(true, 'Signing in...')
    this.props.setSignInPending(true)
    const method = 'SignInScreen::_signInAsync'
    this._getChannelsData()
    const {BlockstackNativeModule} = NativeModules
    const baseUrl = 'https://www.stealthy.im'
    if (utils.isAndroid()) {
      // Need to populate userData as follows:
      // {
      //   username: <...>,
      //   profileURL: <...>,   TODO: AC
      //   privateKey: <...>,
      //   appPublicKey: <...>,
      // }
      let userData = {}

      try {
        // androidUserData {
        //   decentralizedID: <...>
        //   appPrivateKey: <...>
        // }
        const androidUserData = await BlockstackNativeModule.signIn()
        userData.privateKey = androidUserData.appPrivateKey
        userData.username = androidUserData.username
      } catch (error) {
        this.props.setSignInPending(false)
        this.props.setSpinnerData(false, '')
        throw utils.fmtErrorStr('Failed to sign in to Blockstack.', method, error)
      }

      try {
        const publicKey = await BlockstackNativeModule.getPublicKeyFromPrivateKey(userData.privateKey)
        userData.appPublicKey = publicKey
      } catch (error) {
        this.props.setSignInPending(false)
        this.props.setSpinnerData(false, '')
        throw utils.fmtErrorStr('Failed to get public key.', method, error)
      }
      if (userData.username === 'null') {
        this.setState({error: true, errorText: 'User data not found. Please ensure you have a valid Blockstack username. E-mail support@stealthy.im for further help.'})
      } else {
        AsyncStorage.setItem('userData', JSON.stringify(userData))
        this.props.screenProps.authWork(userData)
        AsyncStorage.setItem('appVersion', JSON.stringify(VersionNumber.appVersion))
      }
      this.props.setSignInPending(false)
      this.props.setSpinnerData(false, '')
    } else if (utils.is_iOS()) {
      await BlockstackNativeModule.signIn(`${baseUrl}/redirect.html`, baseUrl, null, (error, events) => {
        if (!error) {
          this._getUserData()
        } else {
          this.props.setSignInPending(false)
          this.props.setSpinnerData(false, '')
        }
      })
    }
  }
}

const styles = StyleSheet.create({
  text: { fontWeight: 'bold', fontSize: 20 },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
  },
  tabItem: {
    flex: 1,
    textAlign: 'center',
    alignItems: 'center'
  },
})

const mapStateToProps = (state) => {
  return {
    spinner: EngineSelectors.getSignInPending(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setSignInPending: (flag) => dispatch(EngineActions.setSignInPending(flag)),
    setChannelsData: (channels) => dispatch(EngineActions.setChannelsData(channels)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
    // setEngineFault: (flag) => dispatch(EngineActions.setEngineFault(flag)),
  }
}

const SignInScreenExplained = copilot({ animated: true, overlay: 'svg' })(SignInScreen);

export default connect(mapStateToProps, mapDispatchToProps)(SignInScreenExplained)
