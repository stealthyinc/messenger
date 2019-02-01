import React from 'react'
import { Image, View, StyleSheet, Platform, TouchableOpacity, Text as AText } from 'react-native'
import { Avatar, Button, Icon, Text } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import { Toast } from 'native-base'
import { shareOnTwitter } from 'react-native-social-share'
import Communications from 'react-native-communications'
import ActionSheet from 'react-native-actionsheet'
import QRCode from 'react-native-qrcode'
import Ionicons from 'react-native-vector-icons/Ionicons'
import AwesomeAlert from 'react-native-awesome-alerts'
import { copilot, walkthroughable, CopilotStep } from '@okgrow/react-native-copilot'

const utils = require('./../Engine/misc/utils.js')
const WalkthroughableText = walkthroughable(AText);

const CustomIcon = ({ copilot, disabled, name, flag, onPress }) => (
  <View {...copilot} style={styles.title}>
    <Icon
      reverse
      disabled={disabled}
      name={name}
      type='font-awesome'
      color={(flag) ? '#34bbed' : 'grey'}
      onPress={onPress}
    />
  </View>
)

class ProfileScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {}
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.start()} style={{marginLeft: 10}}>
          <Ionicons name='md-help-circle' size={30} color='white' />
        </TouchableOpacity>
      ),
      headerTitle: <Text h4 style={{fontWeight: 'bold', color: 'white'}}>Profile</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        <TouchableOpacity onPress={() => params.logout()} style={{marginRight: 10}}>
          <Ionicons name="md-exit" size={30} color='white'/>
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    }
  }
  constructor (props) {
    super(props)
    this.state = {
      showToast: false,
      showQR: false,
      isVisible: false,
      showAlert: false
    }
  }
  componentDidMount() {
    this.props.copilotEvents.on('stepChange', this.handleStepChange);
    this.props.navigation.setParams({ showOverlay: this.showOverlay, logout: this.showAlert, start: this.props.start })
  }
  handleStepChange = (step) => {
    console.log(`Current step is: ${step.name}`);
  }
  runLogout = () => {
    this.props.setSpinnerData(true, 'Logging out...')
    this.props.screenProps.logout()
  }
  showOverlay = () => {
    this.setState({isVisible: !this.state.isVisible})
  }
  showActionSheet = () => {
    this.ActionSheet.show()
  }
  showAlert = () => {
    this.setState({
      showAlert: true
    })
  }
  hideAlert = () => {
    this.setState({
      showAlert: false
    })
  }
  render () {
    const { userProfile, userData, userSettings } = this.props
    if (!userProfile) { return null }
    const { discovery, notifications, analytics } = userSettings
    const { profile, base64 } = userProfile
    let { username } = userData
    const { name } = profile
    const fullName = (name) || null
    const shareText = 'You can securely message me at: ' + username + ' on @stealthyim! #decentralize #takebackcontrol #controlyourdata https://www.stealthy.im'
    // const shareText1 = 'Come chat with me on Stealthy.IM! Add me: ' + username
    const oldPad = utils.is_oldPad()
    const margin = 20
    const marginTop = (oldPad) ? 5 : 15
    const marginBottom = (oldPad) ? 2 : 15
    const mainContainerTopPadding = (oldPad) ? '8%' : '13%'
    const buttonRowWidth = (oldPad) ? '98%' : '90%'
    // const qrText = `stealthy://messages/`+username+`/`
    const qrText = username
    const { showQR, showAlert } = this.state
    const borderAccentColor='#C2C2C2'
    if (showAlert) {
      return (
        <AwesomeAlert
          show={showAlert}
          showProgress={false}
          title="Logout"
          message="Are you sure you want to log out?"
          closeOnTouchOutside={true}
          closeOnHardwareBackPress={false}
          showCancelButton={true}
          showConfirmButton={true}
          cancelText="No, cancel"
          confirmText="Yes, logout"
          confirmButtonColor="#DD6B55"
          onCancelPressed={() => {
            this.hideAlert()
          }}
          onConfirmPressed={() => {
            this.runLogout()
          }}
        />
      )
    }
    let AvatarElement = undefined
    if (showQR || !base64) {
      AvatarElement = ({ copilot }) => (
        <View {...copilot}>
          <QRCode value={qrText} size={160} bgColor='black' fgColor='white' />
        </View>
      )
    } else {
      let marginBottomVal = (oldPad || (Platform.OS !== 'ios')) ? 5 : 15
      let sizeVal = (oldPad || (Platform.OS !== 'ios')) ? 'large' : 'xlarge'
      AvatarElement = ({ copilot }) => (
        <View {...copilot}>
          <Avatar
            size={sizeVal}
            source={{uri: base64}}
            overlayContainerStyle={{backgroundColor: 'white'}}
            containerStyle={{marginBottom: marginBottomVal}}
            avatarStyle={{borderColor: borderAccentColor,
                          borderRadius: 15,
                          borderWidth: 1}} />
        </View>
      )
    }
    const CustomButton = ({ copilot }) => (
      <View {...copilot} style={styles.title}>
        <Button
          onPress={this.showActionSheet}
          icon={{name: 'share', color: 'white'}}
          buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 15, width: 150, height: 50, backgroundColor: '#34bbed'}}
          titleStyle={{ fontSize: 18, fontWeight: '900', color: 'white' }}
          title='Share ID'
        />
      </View>
    )
    if (username.length > 24) {
      username = username.substring(0, 21) + '...'
    }
    const myAppVersion = (this.props.appVersion) ? 'v' + this.props.appVersion : null
    return (
      <View style={styles.container}>
        <View style={{flex: 1,
                      width: '100%',
                      alignItems: 'center'}}>

          <View style={{flex: 0.5}} />

          <View style={{alignItems: 'center'}}>
            <CopilotStep text="This is your profile picture or QRCode" order={1} name="profilePicture">
              <AvatarElement />
            </CopilotStep>
            <CopilotStep text="This is your Blockstack User ID" order={2} name="userid">
              <WalkthroughableText style={styles.title}>
                <Text h4 style={{marginTop, marginBottom, fontWeight: 'bold'}}>{username}</Text>
              </WalkthroughableText>
            </CopilotStep>
            <Text h4 style={{fontStyle: 'italic'}}>{fullName}</Text>
          </View>

          <View style={{flex: 0.25}} />
          <View style={{alignItems: 'center'}}>
            <CopilotStep text="Share your Blockstack ID with your friends" order={3} name="share">
              <CustomButton />
            </CopilotStep>

            <View style={{width: buttonRowWidth,
                          flexDirection: 'row',
                          justifyContent: 'space-around',
                          borderRadius: 15,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: borderAccentColor}}>
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <CopilotStep text="Click here to show your QR code" order={4} name="qrcode">
                  <CustomIcon 
                    name='qrcode'
                    disabled={!base64}
                    flag={showQR}
                    onPress={() => {
                      Toast.show({
                        text: (showQR) ? 'Hide QR Code' : 'Show QR Code',
                        duration: 1500
                      })
                      this.setState({showQR: !showQR})
                    }}
                  />
                </CopilotStep>
                <Text style={{color: borderAccentColor}}>QR Code</Text>
              </View>
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <CopilotStep text="Click here to toggle contact discovery" order={5} name="discover">
                  <CustomIcon 
                    name='connectdevelop'
                    disabled={false}
                    flag={discovery}
                    onPress={() => {
                      Toast.show({
                        text: (discovery) ? 'Discovery Setting Disabled!' : 'Discovery Setting Enabled!',
                        duration: 1500
                      })
                      this.props.updateUserSettings('discovery')
                    }}
                  />
                </CopilotStep>
                <Text style={{color: borderAccentColor}}>Discovery</Text>
              </View>
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <CopilotStep text="Click here to toggle notifications" order={6} name="notification">
                  <CustomIcon 
                    name='bell'
                    disabled={false}
                    flag={notifications}
                    onPress={() => {
                      Toast.show({
                        text: (notifications) ? 'Notifications Setting Disabled!' : 'Notifications Setting Enabled!',
                        duration: 1500
                      })
                      this.props.updateUserSettings('notifications')
                    }}
                  />
                </CopilotStep>
                <Text style={{color: borderAccentColor}}>Notifications</Text>
              </View>
              <View style={{flexDirection: 'column', alignItems: 'center'}}>
                <CopilotStep text="Click here to toggle analytics" order={7} name="analytics">
                  <CustomIcon 
                    name='pie-chart'
                    disabled={false}
                    flag={analytics}
                    onPress={() => {
                      Toast.show({
                        text: (analytics) ? 'Analytics Setting Disabled!' : 'Analytics Setting Enabled!',
                        duration: 1500
                      })
                      this.props.updateUserSettings('analytics')
                    }}
                  />
                </CopilotStep>
                <Text style={{color: borderAccentColor}}>Analytics</Text>
              </View>
            </View>
          </View>

          <View style={{flex: 0.15}} />
          
          <View style={{alignItems: 'flex-end', justifyContent: 'flex-end', alignSelf: 'stretch', marginRight: 20}}>
            <CopilotStep text="The version of Stealthy running" order={8} name="appVersion">
              <WalkthroughableText style={styles.title}>
                <Text h5 style={{color: borderAccentColor, fontStyle: 'italic', fontWeight: 'bold', textAlign: 'right'}}>{myAppVersion}</Text>
              </WalkthroughableText>
            </CopilotStep>
          </View>

          <View style={{flex: 0.1}} />
        </View>

        <ActionSheet
          ref={o => this.ActionSheet = o}
          title={'Sharing Options'}
          options={['Tweet your ID', 'Invite via SMS', 'Email Contacts', 'Cancel']}
          cancelButtonIndex={3}
          destructiveButtonIndex={3}
          onPress={(index) => {
            if (index === 0) {
              shareOnTwitter({
                'text': shareText
              },
                  (results) => {
                    console.log(results)
                  }
              )
            } else if (index === 1) {
              Communications.textWithoutEncoding(null, `Add me on Stealthy IM: ${username}. Download Stealthy here: http://onelink.to/5krfsk`)
            } else if (index === 2) {
              Communications.email([''], null, null, `Add me on Stealthy IM: ${username}`, 'Download Stealthy here: http://onelink.to/5krfsk')
            }
          }}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center'
  },
  containerEmpty: {
    flex: 1,
    paddingTop: 100,
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
    appVersion: EngineSelectors.getAppVersion(state),
    userProfile: EngineSelectors.getUserProfile(state),
    publicKey: EngineSelectors.getPublicKey(state),
    userData: EngineSelectors.getUserData(state),
    userSettings: EngineSelectors.getUserSettings(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateUserSettings: (radio) => dispatch(EngineActions.updateUserSettings(radio)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

const ProfileScreenExplained = copilot({ animated: true, androidStatusBarVisible: true, overlay: 'svg' })(ProfileScreen);

export default connect(mapStateToProps, mapDispatchToProps)(ProfileScreenExplained)
