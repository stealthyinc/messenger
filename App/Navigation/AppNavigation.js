import { Animated, Easing } from 'react-native'
import { StackNavigator, SwitchNavigator } from 'react-navigation'
import ChannelScreen from '../Containers/ChannelScreen'
import SlackScreen from '../Containers/SlackScreen'
import CameraRollScreen from '../Containers/CameraRollScreen'
import CameraScreen from '../Containers/CameraScreen'

// Styles
import styles from './Styles/NavigationStyles'
import AuthLoadingScreen from '../Containers/AuthLoadingScreen'
import DemoScreen from '../Components/DemoScreen'
import SignInScreen from '../Containers/SignInScreen'
import TabScreen from '../Containers/TabScreen'
import UpdateScreen from '../Containers/UpdateScreen'
import BlockScreen from '../Containers/BlockScreen'
import ChatScreen from '../Containers/ChatScreen'
import ContactProfile from '../Containers/ContactProfile'
import BlockContactSearch from '../Containers/BlockContactSearch'
import DappScreen from '../Containers/DappScreen'
import DappData from '../Containers/DappData'
import DappStore from '../Containers/DappStore'
import Introduction from '../Components/Introduction'

console.disableYellowBox = true

const transitionConfig = () => {
  return {
    transitionSpec: {
      duration: 750,
      easing: Easing.out(Easing.poly(4)),
      timing: Animated.timing,
      useNativeDriver: true
    },
    screenInterpolator: sceneProps => {
      const { position, layout, scene, index, scenes } = sceneProps
      const toIndex = index
      const thisSceneIndex = scene.index
      const height = layout.initHeight
      const width = layout.initWidth

      const translateX = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex, thisSceneIndex + 1],
        outputRange: [width, 0, 0]
      })

    // Since we want the card to take the same amount of time
    // to animate downwards no matter if it's 3rd on the stack
    // or 53rd, we interpolate over the entire range from 0 - thisSceneIndex
      const translateY = position.interpolate({
        inputRange: [0, thisSceneIndex],
        outputRange: [height, 0]
      })

      const slideFromRight = { transform: [{ translateX }] }
      const slideFromBottom = { transform: [{ translateY }] }

      const lastSceneIndex = scenes[scenes.length - 1].index

    // Test whether we're skipping back more than one screen
      if (lastSceneIndex - toIndex > 1) {
      // Do not transoform the screen being navigated to
        if (scene.index === toIndex) return
      // Hide all screens in between
        if (scene.index !== lastSceneIndex) return { opacity: 0 }
      // Slide top screen down
        return slideFromBottom
      }

      return slideFromRight
    }
  }
}

const PrimaryNav = StackNavigator({
  Tab: { screen: TabScreen },
  ChatRoom: { screen: ChatScreen },
  Camera: { screen: CameraScreen },
  Update: { screen: UpdateScreen },
  CameraRoll: { screen: CameraRollScreen },
  ContactProfile: { screen: ContactProfile },
  BlockContactSearch: { screen: BlockContactSearch },
  SlackScreen: { screen: SlackScreen },
  ChannelRoom: { screen: ChannelScreen },
  DappStore: { screen: DappStore },
  DappData: { screen: DappData },
  DappScreen: { screen: DappScreen },
  initialRouteName: 'Tab',
  transitionConfig
})

const AuthStack = StackNavigator({
  // Intro: { screen: Introduction },
  SignIn: { screen: SignInScreen },
  Demo: { screen: DemoScreen },
  initialRouteName: 'Intro',
  transitionConfig
})

export default SwitchNavigator(
  {
    AuthLoading: AuthLoadingScreen,
    App: PrimaryNav,
    Auth: AuthStack,
    Block: BlockScreen
  },
  {
    headerMode: 'none',
    initialRouteName: 'AuthLoading',
    navigationOptions: {
      headerStyle: styles.header
    }
  }
)
