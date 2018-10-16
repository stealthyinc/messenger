import React, { Component } from 'react'
import { TouchableOpacity, Text } from 'react-native';

const Color = {
  defaultColor: '#b2b2b2',
  backgroundTransparent: 'transparent',
  defaultBlue: '#0084ff',
  leftBubbleBackground: '#f0f0f0',
  white: '#fff',
  carrot: '#e67e22',
  emerald: '#2ecc71',
  peterRiver: '#3498db',
  wisteria: '#8e44ad',
  alizarin: '#e74c3c',
  turquoise: '#1abc9c',
  midnightBlue: '#2c3e50',
  optionTintColor: '#007AFF',
  timeTextColor: '#aaa',
}

const { carrot, emerald, peterRiver, wisteria, alizarin, turquoise, midnightBlue } = Color;

export default class LetterAvatar extends Component {
  setAvatarColor = (username) => {
    const name = username.toUpperCase().split(' ');
    if (name.length === 1) {
      this.avatarName = `${name[0].charAt(0)}`;
    } else if (name.length > 1) {
      this.avatarName = `${name[0].charAt(0)}${name[1].charAt(0)}`;
    } else {
      this.avatarName = '';
    }

    let sumChars = 0;
    for (let i = 0; i < username.length; i += 1) {
      sumChars += username.charCodeAt(i);
    }

    // inspired by https://github.com/wbinnssmith/react-user-avatar
    // colors from https://flatuicolors.com/
    const colors = [carrot, emerald, peterRiver, wisteria, alizarin, turquoise, midnightBlue];

    this.avatarColor = colors[sumChars % colors.length];
  }
  renderInitials = (username) => {
    return <Text style={[styles.textStyle, this.props.textStyle]}>{this.avatarName}</Text>;
  }
  render() {
    const { username } = this.props
    this.setAvatarColor(username);
    return (
      <TouchableOpacity
        disabled={true}
        onPress={() => console.log('clicked')}
        style={[styles.avatarStyle, { backgroundColor: this.avatarColor }]}
      >
        {this.renderInitials(username)}
      </TouchableOpacity>
    )
  }
}

const styles = {
  avatarStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarTransparent: {
    backgroundColor: Color.backgroundTransparent,
  },
  textStyle: {
    color: Color.white,
    fontSize: 16,
    backgroundColor: Color.backgroundTransparent,
    fontWeight: '100',
  },
};