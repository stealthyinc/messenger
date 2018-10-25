import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, View, ViewPropTypes, TouchableOpacity, Text } from 'react-native';
import { GiftedAvatar, Day, utils } from 'react-native-gifted-chat';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { isSameUser, isSameDay } = utils;

const styles = {
  left: StyleSheet.create({
    container: {
      marginRight: 8,
    },
    onTop: {
      alignSelf: 'flex-start',
    },
    onBottom: {},
    image: {
      height: 36,
      width: 36,
      borderRadius: 18,
    },
  }),
  right: StyleSheet.create({
    container: {
      marginLeft: 8,
    },
    onTop: {
      alignSelf: 'flex-start',
    },
    onBottom: {},
    image: {
      height: 36,
      width: 36,
      borderRadius: 18,
    },
  }),
};

export default class Avatar extends React.PureComponent {

  renderAvatar() {
    if (this.props.renderAvatar) {
      const { renderAvatar, ...avatarProps } = this.props;
      return this.props.renderAvatar(avatarProps);
    }
    const votes = (!this.props.currentMessage.user.avatar) ? (
      <View style={{marginRight: 10}}>
        <TouchableOpacity onPress={() => this.props.questionUpvote(this.props.currentMessage._id)}>
          <Ionicons name="ios-arrow-dropup" size={30} color='green'/>
        </TouchableOpacity>
        <Text style={{textAlign: 'center', fontSize: 14}}>10</Text>
      </View>
    ) : <View style={{margin: 20}} />
    return (
      <View style={{flexDirection: 'row'}}>
        {votes}
        <GiftedAvatar
          avatarStyle={StyleSheet.flatten([
            styles[this.props.position].image,
            this.props.imageStyle[this.props.position],
          ])}
          user={this.props.currentMessage.user}
          onPress={() => this.props.onPressAvatar && this.props.onPressAvatar(this.props.currentMessage.user)}
        />
      </View>
    );
  }

  render() {
    const { renderAvatarOnTop, showAvatarForEveryMessage } = this.props;
    const messageToCompare = renderAvatarOnTop ? this.props.previousMessage : this.props.nextMessage;
    const computedStyle = renderAvatarOnTop ? 'onTop' : 'onBottom';

    if (this.props.renderAvatar === null) {
      return null;
    }

    if (
      !showAvatarForEveryMessage &&
      isSameUser(this.props.currentMessage, messageToCompare) &&
      isSameDay(this.props.currentMessage, messageToCompare)
    ) {
      return (
        <View style={[styles[this.props.position].container, this.props.containerStyle[this.props.position]]}>
          <GiftedAvatar
            avatarStyle={StyleSheet.flatten([
              styles[this.props.position].image,
              this.props.imageStyle[this.props.position],
            ])}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles[this.props.position].container,
          styles[this.props.position][computedStyle],
          this.props.containerStyle[this.props.position],
        ]}
      >
        {this.renderAvatar()}
      </View>
    );
  }

}

Avatar.defaultProps = {
  renderAvatarOnTop: false,
  showAvatarForEveryMessage: false,
  position: 'left',
  currentMessage: {
    user: null,
  },
  previousMessage: {},
  nextMessage: {},
  containerStyle: {},
  imageStyle: {},
  onPressAvatar: () => {},
};

Avatar.propTypes = {
  renderAvatarOnTop: PropTypes.bool,
  showAvatarForEveryMessage: PropTypes.bool,
  position: PropTypes.oneOf(['left', 'right']),
  currentMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  onPressAvatar: PropTypes.func,
  renderAvatar: PropTypes.func,
  containerStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style,
  }),
  imageStyle: PropTypes.shape({
    left: ViewPropTypes.style,
    right: ViewPropTypes.style,
  }),
};