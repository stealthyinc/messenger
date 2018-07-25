import PropTypes from 'prop-types';
import React from 'react';
import {
  Text,
  Image,
  Linking,
  Platform,
  StyleSheet,
  ViewPropTypes,
  TouchableOpacity,
} from 'react-native';

export default class CustomView extends React.Component {
  render() {
    const {url, gimage, gtext, onPress} = this.props.currentMessage
    if (url && gimage) {
      return (
        <TouchableOpacity style={[styles.container, this.props.containerStyle]} onPress={() => onPress(url)}>
          <Image
            style={[styles.mapView, this.props.mapViewStyle]}
            source={{uri: gimage}}
          />
          <Text style={{fontSize: 16}}>{`"${gtext}"`}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
  },
  mapView: {
    width: 150,
    height: 100,
    borderRadius: 10,
    margin: 5,
  },
});

CustomView.defaultProps = {
  currentMessage: {},
  containerStyle: {},
  mapViewStyle: {},
};

CustomView.propTypes = {
  currentMessage: PropTypes.object,
  containerStyle: ViewPropTypes.style,
  mapViewStyle: ViewPropTypes.style,
};