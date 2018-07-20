import React from 'react';
import {
  ActivityIndicator,
  AsyncStorage,
  NativeModules,
  StatusBar,
  StyleSheet,
  View,
  Platform
} from 'react-native';
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

const { firebaseInstance } = require('../Engine/firebaseWrapper.js')
const common = require('./../common.js');

class AuthLoadingScreen extends React.Component {
  constructor(props) {
    super(props);
    this._bootstrapAsync();
  }

  // Fetch the token from storage then navigate to our appropriate place
  _bootstrapAsync = async () => {
    const userData = JSON.parse(await AsyncStorage.getItem('userData'));
    if (!userData) {
      this.props.navigation.navigate('Auth');
    }
    else {
      this.props.screenProps.authWork(userData)
    }
  };

  // Render any loading content that you like here
  render() {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar barStyle="default" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen)
