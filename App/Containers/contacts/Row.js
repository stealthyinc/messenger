import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import Swipeout from 'react-native-swipeout'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  text: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold'
  },
  photo: {
    height: 40,
    width: 40,
    borderRadius: 20
  }
})

const Row = (props) => (
  <View style={styles.container}>
    <Image source={{ uri: props.picture.large }} style={styles.photo} />
    <Text style={styles.text}>
      {`${props.name.first} ${props.name.last}`}
    </Text>
  </View>
)

class TouchableRow extends React.PureComponent { // eslint-disable-line react/prefer-stateless-function
  onPress = () => {
    this.props.navigation.navigate('ChatRoom')
  }
  render () {
    const swipeBtns = [{
      text: 'Hide Alerts',
      backgroundColor: 'purple',
      underlayColor: 'white',
      onPress: () => console.log('Hide Alerts')
    },
    {
      text: 'Delete',
      backgroundColor: 'red',
      underlayColor: 'white',
      onPress: () => console.log('Delete')
    }]
    const {data} = this.props
    return (
      <Swipeout right={swipeBtns}
        autoClose
        backgroundColor='transparent'>
        <TouchableOpacity onPress={this.onPress}>
          <Row {...data} />
        </TouchableOpacity>
      </Swipeout>
    )
  }
}

export default TouchableRow
