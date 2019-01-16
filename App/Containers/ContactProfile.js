import React from 'react'
import { Image, Linking, View, TouchableOpacity } from 'react-native'
import { Container, Content, Card, CardItem, Thumbnail, Text, Button, Icon, Left, Body, Right } from 'native-base'
import { connect } from 'react-redux'
import { EngineSelectors } from '../Redux/EngineRedux'
import chatIcon from '../Images/blue512.png'
import Ionicons from 'react-native-vector-icons/Ionicons'

class ContactProfile extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {}
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name='md-arrow-back' size={32} color='white' />
        </TouchableOpacity>
      ),
      headerTintColor: 'white',
      headerStyle: {
        backgroundColor: '#34bbed'
      }
    }
  };
  constructor (props) {
    super(props)
    this.state = {
      dApp: {}
    }
  }
  componentWillMount () {
    this.props.navigation.setParams({ navigation: this.props.navigation })
  }
  getSocial = (profile) => {
    const list = []
    if (profile && profile.account) {
      for (const i of profile.account) {
        if (i.service === 'twitter' || i.service === 'facebook') {
          list.push(
            <Button style={{margin: 10}} transparent key={i.service} onPress={() => Linking.openURL(i.proofUrl).catch(err => console.error('An error occurred', err))}>
              <Icon name={`logo-${i.service}`} />
            </Button>
          )
        }
      }
      return (
        <View style={{flexDirection: 'row'}}>
          {list}
        </View>
      )
    }
    return null
  }
  render () {
    const { activeUserProfile, contactMgr } = this.props
    if (!activeUserProfile) return null
    const activeContact = contactMgr.getActiveContact()
    if (!activeContact) return null
    const { id, title, image } = activeContact
    const { profile } = activeUserProfile
    return (
      <Container>
        <Content>
          <Card>
            <CardItem>
              <Left>
                <Thumbnail source={chatIcon} />
                <Body>
                  <Text>{title}</Text>
                  <Text note>{id}</Text>
                </Body>
              </Left>
              <Right>
                {this.getSocial(profile)}
              </Right>
            </CardItem>
            <CardItem cardBody>
              <Image source={{uri: image}} style={{height: 200, width: null, flex: 1}} />
            </CardItem>
          </Card>
        </Content>
      </Container>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    contactMgr: EngineSelectors.getContactMgr(state),
    activeUserProfile: EngineSelectors.getActiveUserProfile(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ContactProfile)
