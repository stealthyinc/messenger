import React, { Component } from 'react'
import {
  TouchableOpacity,
  View
} from 'react-native'
import { RNCamera } from 'react-native-camera'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons'
import AwesomeAlert from 'react-native-awesome-alerts'
import { Text } from 'react-native-elements'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

// Styles
import styles from './Styles/CameraScreenStyle'

class CameraScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {}
    return {
      title: (<Text h4 style={{fontWeight: 'bold', color: 'white'}}>Scan QR</Text>),
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name='ios-arrow-dropleft' size={32} color='white' />
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    }
  };
  constructor (props) {
    super(props)
    this.state = {
      showAlert: false,
      data: null
    }
  }
  componentWillMount () {
    this.props.navigation.setParams({ navigation: this.props.navigation })
  }
  render () {
    const {showAlert, data} = this.state
    return (
      <View style={styles.container}>
        <AwesomeAlert
          show={showAlert}
          showProgress={false}
          title='Contact Found'
          message={'User ID: ' + data}
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={false}
          showCancelButton
          showConfirmButton
          cancelText='Cancel'
          confirmText='Add Contact'
          cancelButtonColor='#DD6B55'
          confirmButtonColor='#34bbed'
          onCancelPressed={() => this.props.navigation.goBack()}
          onConfirmPressed={() => {
            this.setState({showAlert: false})
            this.props.setSpinnerData(true, 'Adding contact...')
            this.props.addContactId(data)
          }}
        />
        {!showAlert ? (<RNCamera
          ref={ref => {
            this.camera = ref
          }}
          onBarCodeRead={({ data }) => {
            this.setState({showAlert: true, data})
          }}
          style={styles.preview}
          type={RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.on}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
          permissionDialogTitle={'Permission to use camera'}
          permissionDialogMessage={'We need your permission to use your camera phone'}
        />) : null}
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    contactMgr: EngineSelectors.getContactMgr(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    addContactId: (id) => dispatch(EngineActions.addContactId(id)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CameraScreen)
