import React, { Component } from 'react'
import { CameraRoll, ScrollView, TouchableOpacity } from 'react-native'
import { connect } from 'react-redux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text } from 'react-native-elements'

// Styles
import styles from './Styles/CameraRollScreenStyle'
import PhotoBrowser from 'react-native-photo-browser';


class CameraRollScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={32} color='white'/>
        </TouchableOpacity>
      ),
      headerTitle: (<Text h4 style={{marginLeft: 20, fontWeight: 'bold', color: 'white'}}>Camera Roll</Text>),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    };
  };
  constructor (props) {
    super(props)
    this.state = {
      media: []
    }
  }
  async componentWillMount() {
    this.props.navigation.setParams({ navigation: this.props.navigation });
    CameraRoll.getPhotos({
      first: 30,
      assetType: 'Photos',
    })
    .then(data => {
      const media = [];
      data.edges.forEach(d =>
        media.push({
          photo: d.node.image.uri,
        }),
      );
      this.setState({media})
    })
    .catch(error => alert(error));
  };
  render () {
    return (
      <PhotoBrowser
        startOnGrid={true}
        mediaList={this.state.media}
      />
    )
  }
}

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CameraRollScreen)
