import React, { Component } from 'react'
import { View, StatusBar } from 'react-native'
import ReduxNavigation from '../Navigation/ReduxNavigation'
import { connect } from 'react-redux'
import ReduxPersist from '../Config/ReduxPersist'
import EngineWrapper from '../Engine/EngineWrapper'
import EngineActions from '../Redux/EngineRedux'
const { MessagingEngine } = require('../Engine/engine.js');

// Styles
import styles from './Styles/RootContainerStyles'

class RootContainer extends Component {
  constructor(props) {
    super(props);
    //engine work
    const engineInstance = this._initEngineNoData()
    this.props.setEngineInstance(engineInstance)
  }
  componentDidMount () {
    // if redux persist is not active fire startup action
    if (!ReduxPersist.active) {
      this.props.startup()
    }
  }
  logger = (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  }
  _initEngineNoData = () => {
    // Start the engine:
    const logger = this.logger;
    const privateKey = '1';
    const publicKey = '2';
    const isPlugIn = false;
    const avatarUrl = '';  // TODO
    const discoveryPath = ''; // TODO
    const configuration = {
      neverWebRTC: true
    }
    const engine =
      new MessagingEngine(logger,
                          privateKey,
                          publicKey,
                          isPlugIn,
                          avatarUrl,
                          discoveryPath,
                          configuration);

    return engine;
  }
  render () {
    return (
      <View style={styles.applicationView}>
        <StatusBar barStyle='light-content' />
        <ReduxNavigation />
        <EngineWrapper />
      </View>
    )
  }
}

// wraps dispatch to create nicer functions to call within our component
const mapDispatchToProps = (dispatch) => ({
  setEngineInstance: (engineInstance) => dispatch(EngineActions.setEngineInstance(engineInstance)),
})

export default connect(null, mapDispatchToProps)(RootContainer)
