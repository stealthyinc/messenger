import React, { Component } from 'react'
import { View, Text, Image } from 'react-native'
import { Card, ListItem, Button } from 'react-native-elements'

export default class TwitterShareModal extends Component {
  render () {
    return (
      <Card
        title='SHARE STEALTHY ON TWITTER'
        image={{uri: 'https://media.giphy.com/media/aLdiZJmmx4OVW/giphy.gif'}}>
        <View style={{flexDirection: 'row'}}>
          <Button
            onPress={() => this.props.shareSuccess()}
            icon={{name: 'share'}}
            backgroundColor='#03A9F4'
            textStyle={{fontWeight: 'bold'}}
            buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0}}
            title='SHARE NOW' />
          <Button
            onPress={() => this.props.shareDecline()}
            icon={{name: 'cancel'}}
            backgroundColor='red'
            textStyle={{fontWeight: 'bold'}}
            buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0}}
            title='LATER' />
        </View>
      </Card>
    )
  }
}
