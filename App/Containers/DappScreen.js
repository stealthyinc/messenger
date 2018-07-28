import React, { Component } from 'react'
import { ActivityIndicator, ScrollView, Text, WebView } from 'react-native'
import { connect } from 'react-redux'
import DappActions, { DappSelectors } from '../Redux/DappRedux'

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
    this.props.setDappUrl('')
  }

  render () {
    return (
      <WebView
        source={{uri: this.props.dappUrl}}
        startInLoadingState={true}
      />
    )
  }
}

const mapStateToProps = (state) => {
  return {
    dappUrl: DappSelectors.getDappUrl(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DappScreen)
