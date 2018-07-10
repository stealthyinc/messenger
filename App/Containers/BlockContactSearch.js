import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Container, Header, Content, List, ListItem, Thumbnail, Text, Body } from 'native-base';
import { Platform } from 'react-native'
import { SearchBar } from 'react-native-elements'
import BlockstackContactsActions, { BlockstackContactsSelectors } from '../Redux/BlockstackContactsRedux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native'

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
  constructor (props) {
    super(props)
    this.state = {
      showLoading: false,
      searchInit: false
    }
  }
  componentDidMount() {
    this.search.focus()
    this.props.request('')
  }
  componentWillReceiveProps(nextProps) {
    const { contactAdded } = nextProps
    const { searchInit } = this.state
    if (contactAdded && searchInit) {
      this.props.navigation.goBack()
      this.props.navigation.navigate('ChatRoom')
      this.props.setContactAdded(false)
    }
  }
  parseContact(item) {
    let userImage = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
    const { profile, username, fullyQualifiedName } = item
    const { contactMgr } = this.props
    const found = contactMgr.getContact(fullyQualifiedName)
    if (found) {
      this.props.navigation.goBack()
      this.props.navigation.navigate('ChatRoom')
    }
    const { image, name, description } = profile
    if (image && image.length) {
      userImage = image[0].contentUrl
    }
    let fullName = username
    if (name)
      fullName = name
    const cleanItem = {
      description,
      id: username,
      image: userImage,
      key: Date.now(),
      title: name
    }
    this.props.addNewContact(cleanItem)
    this.props.setActiveContact(fullyQualifiedName);
  }
  createListItem(payload) {
    return (payload && payload.results) ? payload.results.map((item, i) => (
      <ListItem key={i} onPress={this.parseContact.bind(this, item)}>
        <Thumbnail square size={80} source={{ uri: (item.profile.image && item.profile.image[0]) ? item.profile.image[0].contentUrl : '' }} />
        <Body>
          <Text>{(item.profile.name) ? `${item.profile.name} (${item.username})` : item.username}</Text>
          <Text note>{item.profile.description ? item.profile.description : null}</Text>
        </Body>
      </ListItem>
    )) : (this.state.showLoading) ? <View style={[styles.container, styles.horizontal]}><ActivityIndicator size="large" color="#34bbed" /></View> : null
  }
  onChangeText = (text) => {
    const timeout = (text.length < 3) ? 1000 : 500
    if (text.length > 1) {
      setTimeout(() => {
        this.props.request(text)
        this.setState({showLoading: true, searchInit: true})
      }, timeout);
    }
    else if (text.length === 0) {
      this.props.request('')
      this.setState({showLoading: false, searchInit: false})
    }
  }
  onClear = () => {
    this.props.request('')
    this.setState({showLoading: false, searchInit: false})
  }
  render() {
    return (
      <Container style={{backgroundColor: 'white'}}>
        <SearchBar
          lightTheme
          round
          cancelButtonTitle='Cancel'
          platform={Platform.OS}
          ref={search => this.search = search}
          searchIcon={{ color: 'white', size: 24 }}
          onChangeText={this.onChangeText}
          clearIcon={null}
          onClear={this.onClear}
          onCancel={this.onClear}
          autoCorrect={false}
          autoCapitalize='none'
          placeholder='Search for contacts...' />
        <Content>
          {this.createListItem(this.props.contact.payload)}
        </Content>
      </Container>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    contact: state.contact,
    contactMgr: EngineSelectors.getContactMgr(state),
    contactAdded: EngineSelectors.getContactAdded(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    request: (data) => dispatch(BlockstackContactsActions.blockstackContactsRequest({data})),
    clear: () => dispatch(BlockstackContactsActions.blockstackContactsClear()),
    addNewContact: (contact) => dispatch(EngineActions.addNewContact(contact)),
    setContactAdded: (flag) => dispatch(EngineActions.setContactAdded(flag)),
    setActiveContact: (contact) => dispatch(EngineActions.setActiveContact(contact)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockContactSearch)
