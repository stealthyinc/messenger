import React, { Component } from 'react'
import { Linking } from 'react-native'
import { connect } from 'react-redux'
// Add Actions - replace 'Your' with whatever your reducer is called :)
// import YourActions from '../Redux/YourRedux'
import AwesomeAlert from 'react-native-awesome-alerts'
import EngineActions from '../Redux/EngineRedux'
const utils = require('./../Engine/misc/utils.js')

// Styles
import styles from './Styles/UpdateScreenStyle'

class UpdateScreen extends Component {
  static navigationOptions = {
    header: null
  };
  constructor (props) {
    super(props)
    this.props.setSpinnerData(false, '')
  }
  runLogout = () => {
    this.props.screenProps.logout()
    this.props.setSpinnerData(true, 'Logging out...')
  }
  render () {
    return (
      <AwesomeAlert
        show={true}
        showProgress={false}
        title='App Update Required'
        message='Please update your app to fix a Blockstack security issue'
        closeOnTouchOutside={false}
        closeOnHardwareBackPress={false}
        showCancelButton
        showConfirmButton
        cancelText='Logout'
        confirmText='Update App'
        cancelButtonColor='#DD6B55'
        confirmButtonColor='#34bbed'
        onCancelPressed={() => {
          this.runLogout()
        }}
        onConfirmPressed={() => {
          if (utils.is_iOS()) {
            Linking.openURL('https://itunes.apple.com/us/app/stealthy-im/id1382310437?ls=1&mt=8').catch(err => console.error('An error occurred', err))
          }
          else {
            Linking.openURL('https://play.google.com/store/apps/details?id=com.stealthy').catch(err => console.error('An error occurred', err))
          }
        }}
      />
    )
  }
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UpdateScreen)
