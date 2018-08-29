import React from 'react'
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const SkipButton = (Platform.OS === 'ios') ? (({
  styles, onSkipBtnClick, isSkipBtnShow,
  leftTextColor,
  skipBtnLabel,
  skipFadeOpacity
}) => {
  return (
    <Animated.View style={[styles.btnContainer, {
      opacity: skipFadeOpacity,
      transform: [{
        translateX: skipFadeOpacity.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 15],
        }),
      }],
    }]}
    >
      <TouchableOpacity
        style={styles.full}
        onPress={isSkipBtnShow ? () => onSkipBtnClick() : null}>
        <Text style={[styles.controllText, { color: leftTextColor, marginRight: 40 }]}>
          {skipBtnLabel}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}) : (({
  styles, onSkipBtnClick, isSkipBtnShow,
  leftTextColor,
  skipBtnLabel,
  skipFadeOpacity
}) => {
  return (
    <View style={[styles.btnContainer, {
        paddingBottom: 5,
        opacity: isSkipBtnShow ? 1 : 0,
      }]}>
      <TouchableOpacity
        style={styles.full}
        onPress={isSkipBtnShow ? () => onSkipBtnClick() : null}>
        <Ionicons name="ios-arrow-dropright" size={32} style={{ color: leftTextColor, marginRight: 10 }}/>
      </TouchableOpacity>
    </View>
  )
})

export default SkipButton