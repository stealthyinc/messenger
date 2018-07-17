import React, { Component } from 'react'
import { View, SafeAreaView, StatusBar } from 'react-native'
import ReduxNavigation from '../Navigation/ReduxNavigation'
import { connect } from 'react-redux'
import ReduxPersist from '../Config/ReduxPersist'

// Styles
import styles from './Styles/RootContainerStyles'

class RootContainer extends Component {
  render () {
    return (
	// <SafeAreaView style={{flex: 1}}>
		<View style={styles.applicationView}>
		  <StatusBar barStyle='light-content' />
		  <ReduxNavigation />
		</View>
	// </SafeAreaView>
    )
  }
}

// wraps dispatch to create nicer functions to call within our component
const mapDispatchToProps = (dispatch) => ({
})

export default connect(null, mapDispatchToProps)(RootContainer)
