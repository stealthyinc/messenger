import React, { Component } from 'react'
import { ActivityIndicator, View, Text, WebView, TouchableOpacity } from 'react-native'
import { connect } from 'react-redux'
import DappActions, { DappSelectors } from '../Redux/DappRedux'
import Ionicons from 'react-native-vector-icons/Ionicons';

// Styles
import styles from './Styles/DappScreenStyle'

class DappScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  }
  componentWillMount() {
    this.props.navigation.setParams({ navigation: this.props.navigation });
  }
  componentWillUnmount() {
    this.props.setDappUrl('')
  }
  renderLoading = () => {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#34bbed" />
      </View>
    )
  }
  render () {
    return (
      <WebView
        source={{uri: this.props.dappUrl}}
        startInLoadingState={true}
        renderLoading={this.renderLoading}
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
