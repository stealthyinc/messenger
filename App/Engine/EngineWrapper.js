import React, { Component } from 'react'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
const { MessagingEngine } = require('./engine.js');

class EngineWrapper extends Component {
  constructor(props) {
    super(props);
  }
  static Instance = new MessagingEngine(
                          logger= (...args) => {
                            if (process.env.NODE_ENV === 'development') {
                              console.log(...args);
                            }
                          },
                          '1',
                          '2',
                          false,
                          '',
                          '',
                          {
                            neverWebRTC: true
                          })

  componentDidMount() {
    const fakeUserId = 'alexc.id';
    const { engineInit } = this.props
    if (EngineWrapper.Instance) {
      EngineWrapper.Instance.componentDidMountWork(engineInit, fakeUserId);
      EngineWrapper.Instance.on('me-initialized', () => {
        console.log(`Messaging Engine initialized`)
        this.props.setEngineInitial(true)
      });
      EngineWrapper.Instance.on('me-update-contactmgr', (contactMgr) => {
        console.log(`Messaging Engine updated contact manager:`)
        this.props.setEngineContactMgr(contactMgr)
      });
      EngineWrapper.Instance.on('me-update-messages', (messages) => {
        console.log(`Messaging Engine updated messages`)
        this.props.setEngineMessages(messages)
      });
    }
  }
  logger = (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  }
  // _initEngineNoData = () => {
  //   // Start the engine:
  //   const logger = this.logger;
  //   const privateKey = '1';
  //   const publicKey = '2';
  //   const isPlugIn = false;
  //   const avatarUrl = '';  // TODO
  //   const discoveryPath = ''; // TODO
  //   const configuration = {
  //     neverWebRTC: true
  //   }
  //   const engine =
  //     new MessagingEngine(logger,
  //                         privateKey,
  //                         publicKey,
  //                         isPlugIn,
  //                         avatarUrl,
  //                         discoveryPath,
  //                         configuration);

  //   return engine;
  // }
  _getUserData = () => {
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
              // Start the engine:
              const logger = undefined;
              const privateKey = userData['privateKey'];
              const isPlugIn = false;
              const avatarUrl = '';  // TODO
              const discoveryPath = ''; // TODO
              this.engine =
                new MessagingEngine(logger,
                                    privateKey,
                                    publicKey,
                                    isPlugIn,
                                    this.props.avatarUrl,
                                    this.props.path);

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
        return userData;
      }
    });
    return undefined;
  };
  render() {
    return null
  }
}

const mapStateToProps = (state) => {
  return {
    engineInit: EngineSelectors.getEngineInit(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setEngineInitial: (engineInit) => dispatch(EngineActions.setEngineInitial(engineInit)),
    setEngineMessages: (messages) => dispatch(EngineActions.setEngineMessages(messages)),
    setEngineContactMgr: (contactMgr) => dispatch(EngineActions.setEngineContactMgr(contactMgr)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EngineWrapper)
