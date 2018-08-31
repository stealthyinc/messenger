import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { 
  ActivityIndicator, 
  AsyncStorage, 
  NativeModules, 
  Image,
  View, 
  Text, 
  StyleSheet,
  ScrollView, 
  Platform 
} from 'react-native'
import { Button, SocialIcon } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const utils = require('./../Engine/misc/utils.js');

const { firebaseInstance } = require('../Engine/firebaseWrapper.js');

const common = require('./../common.js');
import chatIcon from '../Images/blue512.png';

class BlockScreen extends Component {
  constructor(props) {
    super(props)
    this.state = {
      spinner: false
    }
  }
  _unlockEngine = async () => {
    const { publicKey } = this.props
    if (publicKey) {
      firebaseInstance.setFirebaseData(common.getDbSessionPath(publicKey), common.getSessionId())
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      this.setState({spinner: true})

      // Delay before starting session to allow closing session to finish writes etc.
      // Thoughts:
      //   - would be good to implement a handshake to know if this is necessary / status etc.
      const DELAY_BEFORE_START_MS = 5 * 1000;
      utils.resolveAfterMilliseconds(DELAY_BEFORE_START_MS)
      .then(() => {
        this.setState({spinner: false})
        this.props.screenProps.authWork(userData)
      })
      .catch((err) => {
        this.setState({spinner: false})
        console.log(`ERROR(Blockstack.js::_unlockEngine): ${err}`)
        this.props.screenProps._authWork(userData)
      })
    } else {
      this.props.navigation.navigate('Auth');
    }
  }
  render () {
    const activityIndicator = (this.state.spinner) ?
      (<ActivityIndicator size="large" color="#34bbed"/>) : null;
    const marginBottom = (this.props.spinner) ? 40 : 80
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{flexDirection: 'row', marginTop: 40}}>
          <SocialIcon
            style={{width: 45, height: 45}}
            type='twitter'
            onPress={() => Linking.openURL('https://twitter.com/stealthyim').catch(err => console.error('An error occurred', err))}
          />
          <SocialIcon
            style={{width: 45, height: 45}}
            type='medium'
            onPress={() => Linking.openURL('https://medium.com/@stealthyim').catch(err => console.error('An error occurred', err))}
          />
          <Button
            onPress={() => console.log('boo')}
            dispabled
            title=""
            titleStyle={{ fontSize: 16, fontWeight: "bold", color: "#34bbed"}}
            buttonStyle={{
              marginLeft: 20,
              width: 200,
              height: 50,
              backgroundColor: "white",
              marginTop: 5
            }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: 120}}>
          <Image
            source={chatIcon}
            style={{width: 50, height: 50}}
          />
          <Text style={{ fontWeight: 'bold', fontSize: 36, marginLeft: 15, marginBottom: 80, marginTop: 5 }}>Unlock Stealthy</Text>
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 20, color: 'grey', marginBottom, textAlign: 'center' }}>Locked: {this.props.session}</Text>
        {activityIndicator}
        <Button
          onPress={this._unlockEngine}
          title="Unlock Session"
          titleStyle={{ fontSize: 16, fontWeight: "bold", color: "white"}}
          icon={{name: 'unlock-alt', type: 'font-awesome', color: "white"}}
          buttonStyle={{
            backgroundColor: "maroon",
            width: 180,
            height: 50,
            borderColor: "transparent",
            borderWidth: 0,
            borderRadius: 5,
            marginTop: 20
          }}
        />
        <Button
          onPress={this.props.screenProps.logout}
          title="Log Out"
          icon={{name: 'launch', color: 'white'}}
          buttonStyle={{marginTop: 10, borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#34bbed'}}
          titleStyle={{ fontSize: 18, fontWeight: "bold"}}
        />
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  text: { fontWeight: 'bold', fontSize: 20 },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
  },
});

const mapStateToProps = (state) => {
  return {
    publicKey: EngineSelectors.getPublicKey(state),
    session: EngineSelectors.getSession(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockScreen)
