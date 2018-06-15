import React, { Component } from 'react'
// import PropTypes from 'prop-types'
import { AsyncStorage, NativeModules, View, Text } from 'react-native'
import styles from './Styles/BlockScreenStyle'
import { Button } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

class BlockScreen extends Component {
  _signOutAsync = async () => {
    const {BlockstackNativeModule} = NativeModules
    const publicKey = userData['appPublicKey']
    this.props.clearUserData(publicKey)
    await AsyncStorage.clear()
    await BlockstackNativeModule.signOut()
    this.props.navigation.navigate('Auth')
  }
  _unlockEngine = () => {
    this.props.unlockEngine()
    this.props.navigation.navigate('AuthLoading')
  }
  render () {
    return (
      <View contentContainerStyle={styles.container}>
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
          }}
          containerStyle={{ marginTop: 40 }}
        />
        <Button
          onPress={this._signOutAsync}
          icon={{name: 'launch', color: 'white'}}
          buttonStyle={{borderRadius: 5, marginLeft: 0, marginRight: 0, marginBottom: 0, width: 180, height: 50, backgroundColor: '#037aff'}}
          titleStyle={{ fontSize: 18, fontWeight: "bold"}}
          title='Log Out' 
        />
        />
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    userData: EngineSelectors.getUserData(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    clearUserData: (publicKey) => dispatch(EngineActions.clearUserData(publicKey)),
    unlockEngine: () => dispatch(EngineActions.unlockEngine()),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockScreen)