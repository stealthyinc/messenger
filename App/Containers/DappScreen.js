import React, { Component } from 'react'
import { ScrollView, Text, WebView } from 'react-native'
import { connect } from 'react-redux'
// Add Actions - replace 'Your' with whatever your reducer is called :)
// import YourActions from '../Redux/YourRedux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

// Styles
import styles from './Styles/DappScreenStyle'

class DappScreen extends Component {
  // constructor (props) {
  //   super(props)
  //   this.state = {}
  // }
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerBackTitle: 'Back',
    };
  }

  componentWillUnmount() {
    this.props.sendFileUrl('')
  }

  render () {
    return (
      <WebView
        source={{uri: this.props.fileUrl}}
      />
    )
  }
}

const mapStateToProps = (state) => {
  return {
    fileUrl: EngineSelectors.getFileUrl(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    sendFileUrl: (fileUrl) => dispatch(EngineActions.sendFileUrl(fileUrl)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DappScreen)
