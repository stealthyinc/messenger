import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Container, Content, ListItem, Thumbnail, Text, Body } from 'native-base'
import { Button, SearchBar } from 'react-native-elements'
import BlockstackContactsActions, { BlockstackContactsSelectors } from '../Redux/BlockstackContactsRedux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import Communications from 'react-native-communications'
import Ionicons from 'react-native-vector-icons/Ionicons'
import FIcon from 'react-native-vector-icons/dist/FontAwesome'
import Drawer from 'react-native-drawer'
import DiscoverScreen from './DiscoverScreen'
import channel from '../Images/channel.png'

import {
  ActivityIndicator,
  StyleSheet,
  View,
  Platform,
  TouchableOpacity
} from 'react-native'
const utils = require('./../Engine/misc/utils.js')

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center'
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10
  }
})

class BlockContactSearch extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {}
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name='md-arrow-back' size={32} color='white' />
        </TouchableOpacity>
      ),
      headerTitle: <Text h4 style={{fontSize: 25, fontWeight: 'bold', color: 'white'}}>Add Contacts</Text>,
      headerRight: (
        <TouchableOpacity onPress={() => params.navigation.navigate('Camera')} style={{marginRight: 10}}>
          <FIcon name='qrcode' size={30} color='white' />
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
      showLoading: false,
      showNothing: true,
      drawerOpen: false
    }
    this.search = undefined
    this.numContacts = (props.contactMgr)
      ? (props.contactMgr.getAllContacts().length) : 0
  }
  componentWillMount () {
    this.props.navigation.setParams({ navigation: this.props.navigation })
  }
  componentDidMount () {
    this.search.focus()
    this.props.request('')
  }
  componentWillReceiveProps (nextProps) {
    const { contactMgr } = nextProps
    if (contactMgr && contactMgr.getAllContacts().length > this.numContacts) {
      this.numContacts = contactMgr.getAllContacts().length
      this.props.navigation.goBack()
      const theNextActiveContact = contactMgr.getActiveContact()
      this.protocol = (theNextActiveContact)
        ? utils.isChannelOrAma(theNextActiveContact.protocol) : false
      if (theNextActiveContact) {
        if (this.protocol) { this.props.navigation.navigate('ChannelRoom') } else { this.props.navigation.navigate('ChatRoom') }
      } else {
        this.props.navigation.goBack()
      }
      this.props.setContactAdded(false)
      this.props.setSpinnerData(false, '')
    }
  }
  parseContact (item) {
    const { profile, fullyQualifiedName } = item
    const { contactMgr } = this.props
    if (contactMgr.isExistingContactId(fullyQualifiedName)) {
      this.props.navigation.goBack()
      const theNextActiveContactId = fullyQualifiedName
      const theNextActiveContact = contactMgr.getContact(theNextActiveContactId)
      this.props.handleContactClick(theNextActiveContact)
      this.protocol = (theNextActiveContact)
        ? utils.isChannelOrAma(theNextActiveContact.protocol) : false
      if (this.protocol) { this.props.navigation.navigate('ChannelRoom') } else { this.props.navigation.navigate('ChatRoom') }
      // this.props.navigation.navigate('ChatRoom')
    } else {
      // TODO: look at merging this with code that handles engine query to bs endpoint
      //       (api.getUserProfile call results)
      // For now, if no avatarUrl, make it undefined (pbj sets an image automatically)
      const { image, name, description } = profile
      const userImage = (image && image[0] &&
                         'contentUrl' in image[0])
                        ? image[0]['contentUrl'] : undefined

      const contact = {
        description,
        id: fullyQualifiedName,
        image: userImage,
        key: Date.now(),
        title: name
      }
      this.props.addNewContact(contact, true)
      this.props.setSpinnerData(true, 'Adding contact...')
    }
  }
  createListItem (contact) {
    const { payload } = this.props
    const { showNothing, showLoading } = this.state
    if (showNothing) {
      return (
        <ListItem key='channel' onPress={this.toggleDrawer}>
          <Thumbnail square size={80} source={channel} />
          <Body>
            <Text>Add Public Channels</Text>
            <Text note>You can chat with other Blockstack users about various topics in a public forum</Text>
          </Body>
        </ListItem>
      )
    } else if (payload && payload.length) {
      return payload.map((item, i) => (
        <ListItem key={i} onPress={this.parseContact.bind(this, item)}>
          <Thumbnail square size={80} source={{ uri: (item.profile.image && item.profile.image[0]) ? item.profile.image[0].contentUrl : '' }} />
          <Body>
            <Text>{(item.profile.name) ? `${item.profile.name} (${item.username})` : item.username}</Text>
            <Text note>{item.profile.description ? item.profile.description : null}</Text>
          </Body>
        </ListItem>
      ))
    } else if (showLoading) {
      setTimeout(() => {
        this.setState({showLoading: false})
      }, 5000)
      return <View style={[styles.container, styles.horizontal]}><ActivityIndicator size='large' color='#34bbed' /></View>
    } else {
      return (
        <ListItem>
          <Body>
            <Text>No Profiles Found: Invite via Text/Email</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 20}}>
              <Button
                backgroundColor={'#34bbed'}
                onPress={() => Communications.email([''], null, null, 'Add me on Stealthy IM', '')}
                icon={{name: 'email', color: 'white'}}
                title='Email'
                raised
              />
              <Button
                backgroundColor={'#34bbed'}
                onPress={() => Communications.text('')}
                icon={{name: 'chat', color: 'white'}}
                title='Message'
              />
            </View>
          </Body>
        </ListItem>
      )
    }
  }
  onChangeText = (text) => {
    const timeout = (text.length < 3) ? 300 : 200
    if (text.length > 1) {
      setTimeout(() => {
        this.props.request(text)
        this.setState({showLoading: true, showNothing: false})
      }, timeout)
    } else if (text.length < 1) {
      this.onClear()
    }
  }
  onClear = () => {
    this.props.request('')
    this.setState({showLoading: false, showNothing: true})
    this.props.clear()
    // this.search.clear()
  }
  toggleDrawer = () => {
    if (this.state.drawerOpen) { this.closeDrawer() } else { this.openDrawer() }
  };
  closeDrawer = () => {
    this._drawer.close()
  };
  openDrawer = () => {
    this._drawer.open()
  };
  render () {
    const { contactMgr } = this.props
    return (
      <Drawer
        ref={(ref) => this._drawer = ref}
        type='overlay'
        tapToClose
        openDrawerOffset={0.25} // 20% gap on the right side of drawer
        panCloseMask={0.25}
        closedDrawerOffset={-3}
        styles={drawerStyles}
        tweenHandler={(ratio) => ({
          main: { opacity: (2 - ratio) / 2 }
        })}
        content={
          <DiscoverScreen contactMgr={contactMgr} closeDrawer={this.closeDrawer} />
        }
        onOpen={() => {
          this.setState({drawerOpen: true})
        }}
        onClose={() => {
          this.setState({drawerOpen: false})
        }}
        side='bottom'
      >
        <Container style={{backgroundColor: 'white'}}>
          <SearchBar
            containerStyle={{backgroundColor: '#F5F5F5'}}
            inputContainerStyle={{backgroundColor: 'white'}}
            lightTheme
            clearIcon={null}
            platform={Platform.OS}
            ref={search => this.search = search}
            icon={{ type: 'material', name: 'search', size: 28 }}
            onChangeText={this.onChangeText}
            autoCorrect={false}
            autoCapitalize='none'
            onCancel={this.onClear}
            placeholder='Search for contacts...' />
          <Content>
            {this.createListItem(this.props.contact)}
          </Content>
        </Container>
      </Drawer>
    )
  }
}

const drawerStyles = {
  drawer: { shadowColor: '#000000', shadowOpacity: 0.8, shadowRadius: 3 },
  main: {paddingLeft: 3}
}

const mapStateToProps = (state) => {
  return {
    payload: BlockstackContactsSelectors.getPayload(state),
    error: BlockstackContactsSelectors.getError(state),
    contactMgr: EngineSelectors.getContactMgr(state),
    contactAdded: EngineSelectors.getContactAdded(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    request: (data) => dispatch(BlockstackContactsActions.blockstackContactsRequest({data})),
    clear: () => dispatch(BlockstackContactsActions.blockstackContactsFailure()),
    addNewContact: (contact, flag) => dispatch(EngineActions.addNewContact(contact, flag)),
    handleContactClick: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    setContactAdded: (flag) => dispatch(EngineActions.setContactAdded(flag)),
    setActiveContact: (contact) => dispatch(EngineActions.setActiveContact(contact)),
    setSpinnerData: (flag, message) => dispatch(EngineActions.setSpinnerData(flag, message))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockContactSearch)
