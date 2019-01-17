// import React, { Component } from 'react'
// import {
//   StyleSheet,
//   Text,
//   View,
//   Linking
// } from 'react-native'

// import * as Animatable from 'react-native-animatable'
// import Accordion from 'react-native-collapsible/Accordion'

// const CONTENT = [
//   {
//     title: 'What is Stealthy?',
//     content: (<Animatable.Text>
//       <Text>Stealthy is a decentralized, end to end encrypted, p2p chat and video application built with security & privacy in mind.</Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'How much does it cost?',
//     content: (<Animatable.Text>
//       <Text>Stealthy for personal use is free and includes basic features. For more advanced features, we are planning to introduce a fee structure.</Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'Why does decentralization matter?',
//     content: (<Animatable.Text>
//       <Text>
//              Centralization can be a good thing. It helps computers process things faster, for example. But that's changing.{'\n'}{'\n'}
//              Centralization often means companies and governments gaining access to your data without you knowing or approving.{'\n'}{'\n'}
//       </Text>
//       <Text>
//              Decentralization makes that impossible and <Text style={{fontWeight: 'bold'}}>Stealthy</Text> does not store any information.{'\n'}{'\n'}
//       </Text>
//       <Text>See: </Text><Text style={{color: '#34bbed'}} onPress={() => Linking.openURL('https://blockstack.org/faq/#what_is_a_decentralized_internet?').catch(err => console.error('An error occurred', err))}>What is a decentralized_internet?</Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'Why is Stealthy built on Blockstack?',
//     content: (<Animatable.Text>
//       <Text>
//               Blockstack has many advantages over other platforms for building decentralized applications.{'\n'}{'\n'}
//               The primary advantage is that Blockstack is the first to enable sharing of data while maintaining decentralization.{'\n'}{'\n'}
//       </Text>
//       <Text>
//               Until now, decentralized apps were restricted to a single user maintaining decentralized data with no option to share.{'\n'}{'\n'}
//       </Text>
//       <Text>
//         <Text>See: </Text><Text style={{color: '#34bbed'}} onPress={() => Linking.openURL('https://blockstack.org/faq/#what_problems_does_blockstack_solve?').catch(err => console.error('An error occurred', err))}>What problems does blockstack solve?</Text>
//       </Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'What if Blockstack goes away?',
//     content: (<Animatable.Text>
//       <Text>
//               Blockstack is an open source project, so even if the company goes away, the underlying technology still exists and will continue to operate.{'\n'}{'\n'}
//       </Text>
//       <Text>
//         <Text>See: </Text><Text style={{color: '#34bbed'}} onPress={() => Linking.openURL('https://github.com/blockstack').catch(err => console.error('An error occurred', err))}>Blockstack Github</Text>
//       </Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'Where is my data actually being stored?',
//     content: (<Animatable.Text>
//       <Text>
//               This depends on your choices. By default, your data is stored in a dedicated Microsoft Azure Blob. {'\n'}{'\n'}
//       </Text>
//       <Text>
//               But you can and should connect your Blockstack Browser to your own cloud storage solutions (preferably multiple).
//             </Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'How is my data secured?',
//     content: (<Animatable.Text>
//       <Text>
//               Every file and every message is encrypted using ECIES with SHA256. It can only be decrypted by your private key. {'\n'}{'\n'}
//       </Text>
//       <Text>
//               When you write a message, that message is encrypted and can only be decrypted by the specific receiving user's private key.
//             </Text>
//     </Animatable.Text>)
//   },
//   {
//     title: 'Can I delete my data?',
//     content: (<Animatable.Text>
//       <Text>
//               Yes, you can manually delete any and all of your data. Stealthy uses your preferred cloud service to store your information and does not have access to it.
//             </Text>
//     </Animatable.Text>)
//   }
// ]

// const styles = StyleSheet.create({
//   header: {
//     padding: 10
//   },
//   headerText: {
//     textAlign: 'left',
//     fontSize: 16,
//     fontWeight: 'bold'
//   },
//   content: {
//     padding: 20,
//     backgroundColor: '#fff'
//   },
//   title: {
//     textAlign: 'center',
//     fontSize: 22,
//     fontWeight: '300',
//     marginBottom: 20
//   },
//   active: {
//   },
//   inactive: {
//   }
// })

// export default class FAQ extends Component {
//   state = {
//     activeSection: false
//   };

//   _setSection (section) {
//     this.setState({ activeSection: section })
//   }

//   _renderHeader (section, i, isActive) {
//     return (
//       <Animatable.View duration={400} style={[styles.header, isActive ? styles.active : styles.inactive]} transition='backgroundColor'>
//         <Text style={styles.headerText}>{section.title}</Text>
//       </Animatable.View>
//     )
//   }

//   _renderContent (section, i, isActive) {
//     return (
//       <Animatable.View duration={400} style={[styles.content, isActive ? styles.active : styles.inactive]} transition='backgroundColor'>
//         {section.content}
//       </Animatable.View>
//     )
//   }

//   render () {
//     return (
//       <View>
//         <Text style={styles.title}>Frequently Asked Questions</Text>
//         <Accordion
//           activeSection={this.state.activeSection}
//           sections={CONTENT}
//           renderHeader={this._renderHeader}
//           renderContent={this._renderContent}
//           duration={400}
//           onChange={this._setSection.bind(this)}
//         />
//       </View>
//     )
//   }
// }
