import React from 'react'
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';

export const DoneButton = (Platform.OS === 'ios') ? (({
  styles, onDoneBtnClick, onNextBtnClick,
  rightTextColor, isDoneBtnShow,
  doneBtnLabel, nextBtnLabel,
  doneFadeOpacity, skipFadeOpacity, nextOpacity
}) => {
  return (
    <View style={styles.btnContainer}>
      <Animated.View style={[styles.full, { height: 0 }, {
        opacity: doneFadeOpacity,
        transform: [{
          translateX: skipFadeOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 20],
          }),
        }],
      }]}
      >
        <View style={styles.full}>
          <Text style={[styles.controllText, {
            color: rightTextColor, marginLeft: 35
          }]}>
            {doneBtnLabel}
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.full, { height: 0 }, { opacity: nextOpacity }]}>
        <TouchableOpacity style={styles.full}
          onPress={ isDoneBtnShow ? onDoneBtnClick : onNextBtnClick}>
         <Text style={[styles.nextButtonText, { color: rightTextColor, marginLeft: 40 }]}>
          {nextBtnLabel}
        </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}) : (({
  styles, onDoneBtnClick, onNextBtnClick,
  rightTextColor, isDoneBtnShow,
  doneBtnLabel, nextBtnLabel,
}) => {
  return (
    <View style={[styles.btnContainer, { height: 0, paddingBottom: 5 }]}>
      <TouchableOpacity style={styles.full}
        onPress={ isDoneBtnShow ? onDoneBtnClick : onNextBtnClick}
      >
       <Text style={[styles.nextButtonText, { color: rightTextColor, marginLeft: 40 }]}>
         {isDoneBtnShow ? doneBtnLabel : nextBtnLabel}
       </Text>
      </TouchableOpacity>
    </View>
  )
})

export default DoneButton