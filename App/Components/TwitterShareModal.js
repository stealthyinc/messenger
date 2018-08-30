import React, { Component } from 'react'
import { View, Text, Image } from 'react-native'
import { Button } from 'react-native-elements'

export default class TwitterShareModal extends Component {
  render () {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white'}} >
        <Text style={{fontSize: 28, fontWeight: 'bold', marginBottom: 20}}>
          TWEET YOUR STEALTHY ID 🎉
        </Text>
        <Image
          style={{width: 300, height: 300}}
          source={{uri: 'https://media.giphy.com/media/MalZ8ZEtgx0d2/giphy.gif'}}
        />
        <View style={{flexDirection: 'row', marginTop: 20}}>
          <Button
            onPress={() => this.props.shareSuccess()}
            icon={{name: 'sc-twitter', type: 'evilicon', size: 25}}
            backgroundColor='#03A9F4'
            textStyle={{fontWeight: 'bold'}}
            buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0}}
            title='TWEET' />
          <Button
            onPress={() => this.props.shareDecline()}
            icon={{name: 'cancel'}}
            backgroundColor='red'
            textStyle={{fontWeight: 'bold'}}
            buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0}}
            title='LATER' />
        </View>
      </View>
    )
  }
}
