/* eslint-disable no-underscore-dangle, no-use-before-define */

import PropTypes from 'prop-types'
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

export default class ChatFooter extends React.Component {
  render () {
    const { replyTo, replyMsg, dismiss } = this.props
    return (
      <View style={{height: 50, flexDirection: 'row'}}>
        <View style={{height:50, width: 5, backgroundColor: 'red'}}></View>
        <View style={{flexDirection: 'column'}}>
            <Text style={{color: 'red', paddingLeft: 10, paddingTop: 5}}>{replyTo}</Text>
            <Text style={{color: 'gray', paddingLeft: 10, paddingTop: 5}}>{replyMsg}</Text>
        </View>
        <View style={{flex: 1,justifyContent: 'center',alignItems:'flex-end', paddingRight: 10}}>
          <TouchableOpacity onPress={dismiss}>
            <Ionicons name='md-close' size={28} color="#0084ff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}