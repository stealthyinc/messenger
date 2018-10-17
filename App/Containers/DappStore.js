import React, { Component } from 'react'
import { connect } from 'react-redux'
import { 
  AsyncStorage, 
  ScrollView, 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Dimensions, 
  NativeModules 
} from 'react-native';
import DappActions, { DappSelectors } from '../Redux/DappRedux'
import { List, ListItem, Text } from 'react-native-elements'
import { Container, Header, Content, Icon } from 'native-base';
import Ionicons from 'react-native-vector-icons/Ionicons';

import GraphiteIcon from '../Images/GraphiteIcon.png';
import CryptoIcon from '../Images/CryptoIcon.png';
import BlockSignIcon from '../Images/BlockSignIcon.png';
import TravelIcon from '../Images/TravelIcon.png';
import demoIcon from '../Images/democ1.png';
import healthHere from '../Images/healthHere.png';
import note from '../Images/note.png';
import misthos from '../Images/misthos.png';
import chatIcon from '../Images/blue512.png';
const utils = require('./../Engine/misc/utils.js');

class DappStore extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: <Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Partners</Text>,
      headerBackTitle: 'Back',
      headerRight: (
        //params.sendMessage()
        <TouchableOpacity onPress={() => console.log('search dapps')} style={{marginRight: 10}}>
          <Ionicons name="ios-add-circle" size={30} color='white'/>
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
      iconColor: []
    }
  }
  async componentWillMount() {
    this.userData = JSON.parse(await AsyncStorage.getItem('userData'));
    this._iconColor()
  }
  _onPressButton = (url) => {
    this.props.setDappUrl(url)
    this.props.navigation.navigate('DappScreen')
  }
  // iOS specific (possibly works on web too)
  _getUserData = async (app) => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        // throw(`Failed to get user data.  ${error}`);
        // this.props.setEngineFault(true)
        this.setState({error: true, errorText: 'User data not found. Please ensure you have a valid Blockstack username. E-mail support@stealthy.im for further help.'})
        // this.props.setSignInPending(false)
      } else {
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], async (error, publicKey) => {
            if (error) {
              // throw(`Failed to get public key from private. ${error}`);
              // this.props.setEngineFault(true)
              this.setState({error: true, errorText: 'Failed to get public key from private.'})
              // this.props.setSignInPending(false)
            }
            else {
              // userData['appPublicKey'] = publicKey;
              let appData = {
                app,
                privateKey: userData['privateKey'],
                appPublicKey: publicKey
              }
              if (this.userData.apps)
                this.userData.apps.push(appData)
              else {
                let apps = []
                apps.push(appData)
                this.userData.apps = apps
              }
              AsyncStorage.setItem('userData', JSON.stringify(this.userData));
              this._iconColor()
            }
        });
      }
    });
    return;
  };
  _signInAsync = async (baseUrl, app="") => {
    // this.props.setSignInPending(true)
    const method = 'SignInScreen::_signInAsync'

    const {BlockstackNativeModule} = NativeModules;
    // const baseUrl = "https://www.stealthy.im"

    if (utils.isAndroid()) {
      // Need to populate userData as follows:
      // {
      //   username: <...>,
      //   profileURL: <...>,   TODO: AC
      //   privateKey: <...>,
      //   appPublicKey: <...>,
      // }
      let appData = {app}

      try {
        // androidUserData {
        //   decentralizedID: <...>
        //   appPrivateKey: <...>
        // }
        const androidUserData = await BlockstackNativeModule.signIn()
        appData.privateKey = androidUserData.appPrivateKey
        appData.username = androidUserData.username
      } catch (error) {
        this.props.setSignInPending(false)
        throw utils.fmtErrorStr('Failed to sign in to Blockstack.', method, error)
      }

      try {
        const publicKey = await BlockstackNativeModule.getPublicKeyFromPrivateKey(appData.privateKey)
        appData.appPublicKey = publicKey
      } catch (error) {
        this.props.setSignInPending(false)
        throw utils.fmtErrorStr('Failed to get public key.', method, error)
      }
      if (this.userData.apps)
        this.userData.apps.push(appData)
      else {
        let apps = []
        apps.push(appData)
        this.userData.apps = apps
      }
      AsyncStorage.setItem('userData', JSON.stringify(this.userData));
      this._iconColor()
    } else if (utils.is_iOS()) {
      await BlockstackNativeModule.signIn(`${baseUrl}/stealthyredirect.html`, baseUrl, null, (error, events) => {
        if (!error) {
          this._getUserData(app)
        }
        else {
          // this.props.setSignInPending(false)
        }
      });
    }
  }
  _iconColor = () => {
    if (this.userData.apps) {
      let iconColor = []
      for (let data of this.userData.apps) {
        iconColor[data.app] = '#98FB98'
      }
      this.setState({iconColor})
    }
  }
  getIconColor = (app) => {
    if (!this.state.iconColor[app])
      return '#F5F5F5'
    return this.state.iconColor[app]
  }
  handleMiddleWare = (url, app) => {
    if (this.getIconColor(app) === '#98FB98') {
      this._onPressButton(url)
    }
    else {
      this._signInAsync(url, app)
    }
  }
  render() {
    const oldPad = utils.is_oldPad()
    const customStyle = (oldPad) ? styles.oldbutton : styles.button
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{flexDirection: 'row', marginTop: 10, marginBottom: 5}}>
          <View style={{margin: 10}}>
            <TouchableOpacity style={[customStyle, { backgroundColor: this.getIconColor('graphite') }]} onPress={(url) => this.handleMiddleWare('https://serene-hamilton-56e88e.netlify.com', 'graphite')}>
            {/*<TouchableOpacity style={customStyle} onPress={(url) => this._onPressButton('https://www.graphitedocs.com/')}>*/}
              <Image source={GraphiteIcon} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Graphite</Text>
          </View>
          <View style={{margin: 10}}>
            {/*<TouchableOpacity style={customStyle} onPress={() => this.props.navigation.navigate('CameraRoll')}>*/}
            <TouchableOpacity style={[customStyle, { backgroundColor: this.getIconColor('travelstack') }]} onPress={() => this.handleMiddleWare('https://app.travelstack.club', 'travelstack')}>
            {/*<TouchableOpacity style={customStyle} onPress={() => this._onPressButton('https://travelstack.club/')}>*/}
              <Image source={TravelIcon} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Travelstack</Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity style={styles.button} onPress={() => this._onPressButton('https://vote.democracy.earth')}>
              <Image source={demoIcon} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Democracy</Text>
          </View>
        </View>
        <View style={{flexDirection: 'row', marginBottom: 5}}>
          <View style={{margin: 10}}>
            <TouchableOpacity style={[customStyle, { backgroundColor: this.getIconColor('notes') }]} onPress={() => this.handleMiddleWare('https://graphite--infallible-williams-866040.netlify.com', 'notes')}>
            {/*<TouchableOpacity style={customStyle} onPress={() => this._onPressButton('https://note.riot.ai/')}>*/}
              <Image source={note} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Notes</Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity style={customStyle} onPress={() => this.handleMiddleWare('https://testnet.misthos.io/')}>
              <Image source={misthos} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Misthos</Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity style={customStyle} onPress={(url) => this.handleMiddleWare('https://blockusign.co')}>
              <Image source={BlockSignIcon} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Blockusign</Text>
          </View>
        </View>
        {(!oldPad) ? (<View style={{flexDirection: 'row', marginBottom: 5}}>
          <View style={{margin: 10}}>
            <TouchableOpacity style={styles.button} onPress={() => this.handleMiddleWare('https://cryptocracy.io')}>
              <Image source={CryptoIcon} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Cryptocracy</Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity style={customStyle} onPress={() => this.handleMiddleWare('https://www.healthhere.com')}>
              <Image source={healthHere} style={{width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>Clinic Q</Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity disabled={true} style={styles.button} onPress={() => this._onPressButton()}>
              <Image source={chatIcon} style={{opacity: 0.1, width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}></Text>
          </View>
        </View>) : null}
        {(!oldPad) ? (<View style={{flexDirection: 'row', marginBottom: 5}}>
          <View style={{margin: 10}}>
            <TouchableOpacity disabled={true} style={styles.button} onPress={() => this._onPressButton()}>
              <Image source={chatIcon} style={{opacity: 0.1, width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}></Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity disabled={true} style={styles.button} onPress={() => this._onPressButton()}>
              <Image source={chatIcon} style={{opacity: 0.1, width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}></Text>
          </View>
          <View style={{margin: 10}}>
            <TouchableOpacity disabled={true} style={styles.button} onPress={() => this._onPressButton()}>
              <Image source={chatIcon} style={{opacity: 0.1, width: 80, height: 80, borderRadius: 10}}/>
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}></Text>
          </View>
        </View>) : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: (Platform.OS === 'ios') ? 20 : 0,
    shadowColor: '#303838',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
  },
  oldbutton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 5,
    marginBottom: (Platform.OS === 'ios') ? 20 : 0,
    shadowColor: '#303838',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
  },
});

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DappStore)
