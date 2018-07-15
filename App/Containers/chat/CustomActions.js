import PropTypes from 'prop-types';
import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableHighlight,
  TouchableOpacity,
  View,
  ViewPropTypes,
  Text,
  WebView
} from 'react-native';

import CameraRollPicker from 'react-native-camera-roll-picker';
// import NavBar, { NavButton, NavButtonText, NavTitle } from 'react-native-nav';

export default class CustomActions extends React.Component {
  constructor(props) {
    super(props);
    this._images = [];
    this.state = {
      modalVisible: false,
      modalUrl: ''
    };
    this.onActionsPress = this.onActionsPress.bind(this);
    this.selectImages = this.selectImages.bind(this);
  }

  setImages(images) {
    this._images = images;
  }

  getImages() {
    return this._images;
  }

  setModalVisible(visible = false) {
    this.setState({modalVisible: visible});
  }

  onActionsPress() {
    const options = ['Graphite Docs', 'Blockusign PDFs', 'TravelStack Photos', 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    this.context.actionSheet().showActionSheetWithOptions({
      options,
      cancelButtonIndex,
    },
    (buttonIndex) => {
      switch (buttonIndex) {
        case 0:
          this.setModalVisible(true);
          this.setState({modalUrl: 'https://app.graphitedocs.com/'})
          break;
        case 1:
          this.setModalVisible(true);
          this.setState({modalUrl: 'https://blockusign.co/'})
          break;
        case 2:
          this.setModalVisible(false);
          // this.setModalVisible(true);
          // this.setState({modalUrl: 'http://www.travelstack.club/'})
          // break;
        default:
          this.setModalVisible(false);
      }
    });
  }

  selectImages(images) {
    this.setImages(images);
  }

  // renderNavBar() {
  //   return (
  //     <NavBar style={{
  //       statusBar: {
  //         backgroundColor: '#FFF',
  //       },
  //       navBar: {
  //         backgroundColor: '#FFF',
  //       },
  //     }}>
  //       <NavButton onPress={() => {
  //         this.setModalVisible(false);
  //       }}>
  //         <NavButtonText style={{
  //           color: '#000',
  //         }}>
  //           {'Cancel'}
  //         </NavButtonText>
  //       </NavButton>
  //       <NavTitle style={{
  //         color: '#000',
  //       }}>
  //         {'Camera Roll'}
  //       </NavTitle>
  //       <NavButton onPress={() => {
  //         this.setModalVisible(false);

  //         const images = this.getImages().map((image) => {
  //           return {
  //             image: image.uri,
  //           };
  //         });
  //         this.props.onSend(images);
  //         this.setImages([]);
  //       }}>
  //         <NavButtonText style={{
  //           color: '#000',
  //         }}>
  //           {'Send'}
  //         </NavButtonText>
  //       </NavButton>
  //     </NavBar>
  //   );
  // }

  renderIcon() {
    if (this.props.icon) {
      return this.props.icon();
    }
    return (
      <View
        style={[styles.wrapper, this.props.wrapperStyle]}
      >
        <Text
          style={[styles.iconText, this.props.iconTextStyle]}
        >
          +
        </Text>
      </View>
    );
  }

  render() {
    return (
      <TouchableOpacity
        style={[styles.container, this.props.containerStyle]}
        onPress={this.onActionsPress}
      >
        <Modal
          animationType={'slide'}
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={() => {
            this.setModalVisible(false);
          }}
        >
          <TouchableHighlight
            style={{marginTop: 50, marginLeft: 10}}
            onPress={() => {
              this.setModalVisible(false);
            }}>
            <Text style={{color: '#037aff', fontSize: 20}}>Done</Text>
          </TouchableHighlight>
          <WebView
            style={{marginTop: 10}}
            source={{uri: this.state.modalUrl}}
          />
        </Modal>
        {this.renderIcon()}
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: 26,
    height: 26,
    marginLeft: 10,
    marginBottom: 10,
  },
  wrapper: {
    borderRadius: 13,
    borderColor: '#b2b2b2',
    borderWidth: 2,
    flex: 1,
  },
  iconText: {
    color: '#b2b2b2',
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
});

CustomActions.contextTypes = {
  actionSheet: PropTypes.func,
};

CustomActions.defaultProps = {
  onSend: () => {},
  options: {},
  icon: null,
  containerStyle: {},
  wrapperStyle: {},
  iconTextStyle: {},
};

CustomActions.propTypes = {
  onSend: PropTypes.func,
  options: PropTypes.object,
  icon: PropTypes.func,
  containerStyle: ViewPropTypes.style,
  wrapperStyle: ViewPropTypes.style,
  iconTextStyle: Text.propTypes.style,
};