import React from 'react'
import { BackHandler, Platform, NativeModules } from 'react-native'
import { addNavigationHelpers } from 'react-navigation'
import { createReduxBoundAddListener } from 'react-navigation-redux-helpers'
import { connect } from 'react-redux'
import AppNavigation from './AppNavigation'

const { MessagingEngine } = require('../Engine/engine.js');

class ReduxNavigation extends React.Component {
  constructor (props) {
    super (props)

    // this.engine = this._initEngineNoData();
    // this.engineInit = false;
    // this.messages = undefined;

    // this.userData = undefined;

    // this.fakeUserId = 'alexc.id';
    // // this.fakeUserId = 'pbj.id';
    // this.engine.on('me-initialized', () => {
    //   // this.setState({initWithFetchedData: true});
    //   this.engineInit = true;
    // });
  }
  componentDidMount() {
    // this.engine.componentDidMountWork(this.engineInit, this.fakeUserId);

    // console.log('adding listener for MessagingEngine me-update-messages')
    // this.engine.on('me-update-messages', (theMessages) => {
    //   console.log(`Messaging Engine updated messages: ${theMessages}`)
    //   // this.props.storeMessages(theMessages);
    //   if (theMessages) {
    //     // An example printing out the message data.
    //     // TODO: PBJ use this to integrate to your chat component
    //     // {
    //     //   _id: Math.round(Math.random() * 1000000),
    //     //   text: 'Yes, and wallet integration is next!',
    //     //   createdAt: new Date(Date.UTC(2018, 4, 26, 17, 20, 0)),
    //     //   user: {
    //     //     _id: 1,
    //     //     name: 'Developer',
    //     //   },
    //     //   sent: true,
    //     //   received: true,
    //     //   // location: {
    //     //   //   latitude: 48.864601,
    //     //   //   longitude: 2.398704
    //     //   // },
    //     // },
    //     // {
    //     //   _id: Math.round(Math.random() * 1000000),
    //     //   text: 'Is this the new Stealthy Mobile UI?',
    //     //   createdAt: new Date(Date.UTC(2018, 4, 26, 17, 20, 0)),
    //     //   user: {
    //     //     _id: 2,
    //     //     name: 'AC',
    //     //   },
    //     // },
    //     console.log('Messages Object:');
    //     console.log('---------------------------------------------------------');
    //     for (const message of theMessages) {
    //       // TODO: include message.image when we get the avatarUrl & recipientImageUrl
    //       console.log(`${message.author}: "${message.body}"  (seen:${message.seen} time:${message.time} state:${message.state})`);
    //     }
    //     console.log('')
    //     if (this.engineInit) {
    //       this.messages = theMessages;
    //     }
    //   }
    // });

  }
  componentWillMount () {
    if (Platform.OS === 'ios') return
    BackHandler.addEventListener('hardwareBackPress', () => {
      const { dispatch, nav } = this.props
      // change to whatever is your first screen, otherwise unpredictable results may occur
      if (nav.routes.length === 1 && (nav.routes[0].routeName === 'LaunchScreen')) {
        return false
      }
      // if (shouldCloseApp(nav)) return false
      dispatch({ type: 'Navigation/BACK' })
      return true
    })
  }
  componentWillUnmount () {
    if (Platform.OS === 'ios') return
    BackHandler.removeEventListener('hardwareBackPress')
  }
  logger = (...args) => {
    if (process.env.NODE_ENV === 'development' || this.state.console) {
      console.log(...args);
    }
  }
  _getUserData = (completion) => {
    const {BlockstackNativeModule} = NativeModules;
    BlockstackNativeModule.getUserData((error, userData) => {
      if (error) {
        throw(`Failed to get user data.  ${error}`);
      } else {
        console.log(`SUCCESS (getUserData):\n`);
        for (const key in userData) {
          console.log(`\t${key}: ${userData[key]}`)
        }
        // Get public key:
        BlockstackNativeModule.getPublicKeyFromPrivate(
          userData['privateKey'], (error, publicKey) => {
            if (error) {
              throw(`Failed to get public key from private. ${error}`);
            } else {
              console.log(`SUCCESS (loadUserDataObject): publicKey = ${publicKey}\n`);
              userData['appPublicKey'] = publicKey;
              this.userData = userData;
              completion();

              // Start the engine:
              // const logger = undefined;
              // const privateKey = userData['privateKey'];
              // const isPlugIn = false;
              // const avatarUrl = '';  // TODO
              // const discoveryPath = ''; // TODO
              // this.engine =
              //   new MessagingEngine(logger,
              //                       privateKey,
              //                       publicKey,
              //                       isPlugIn,
              //                       this.props.avatarUrl,
              //                       this.props.path);

              // Test encryption
              // let testString = "Concensus";
              // BlockstackNativeModule.encryptPrivateKey(publicKey, testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptPrivateKey): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptPrivateKey(userData['privateKey'], cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptPrivateKey): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test encryptContent / decryptContent
              // let testString = "Content works?";
              // BlockstackNativeModule.encryptContent(testString, (error, cipherObjectJSONString) => {
              //   if (error) {
              //     throw(`Failed to encrpyt with encryptContent: ${error}.`);
              //   } else {
              //     console.log(`SUCCESS (encryptContent): cipherObjectJSONString = ${cipherObjectJSONString}`);
              //     BlockstackNativeModule.decryptContent(cipherObjectJSONString, (error, decrypted) => {
              //       if (error) {
              //         throw(`Failed to decrypt with decryptContent: ${error}.`)
              //       } else {
              //         console.log(`SUCCESS (decryptContent): decryptedString = ${decrypted}`)
              //       }
              //     });
              //   }
              // });

              // Test get file on pk.txt path.
              // BlockstackNativeModule.getRawFile('pk.txt', (error, array) => {
              //   console.log('After getFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${array}`);
              //   console.log('');
              // });

              // Test write/read cycle:
              // BlockstackNativeModule.putFile('testWrite.txt',
              //                                'Will this work?',
              //                                (error, content) => {
              //   console.log('wrote testWrite.txt');
              //   console.log('After putFile:');
              //   console.log('--------------------------------------------------------');
              //   console.log(`error: ${error}`);
              //   console.log(`content: ${content}`);
              //   console.log('');
              //
              //   BlockstackNativeModule.getFile('testWrite.txt', (error, content) => {
              //     console.log('read testWrite.txt');
              //     console.log('After getFile:');
              //     console.log('--------------------------------------------------------');
              //     console.log(`error: ${error}`);
              //     console.log(`content: ${content}`);
              //     console.log('');
              //   });
              // });
            }
        });
        // return userData;
      }
    });
  };
  render () {
    return <AppNavigation navigation={addNavigationHelpers({dispatch: this.props.dispatch, state: this.props.nav, addListener: createReduxBoundAddListener('root') })} />
  }
}

const mapStateToProps = state => ({ nav: state.nav })
export default connect(mapStateToProps)(ReduxNavigation)
