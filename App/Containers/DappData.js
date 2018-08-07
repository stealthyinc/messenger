import React, { Component } from 'react'
import { View, ScrollView, Text, WebView, TouchableOpacity } from 'react-native'
import { connect } from 'react-redux'
// Add Actions - replace 'Your' with whatever your reducer is called :)
// import YourActions from '../Redux/YourRedux'
import Ionicons from 'react-native-vector-icons/Ionicons';
import DappActions, { DappSelectors } from '../Redux/DappRedux'
import { Divider, List, ListItem } from 'react-native-elements'
import GraphiteIcon from '../Images/GraphiteIcon.png';
import BlockSignIcon from '../Images/BlockSignIcon.png';
import CryptoIcon from '../Images/CryptoIcon.png';

class DappData extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerLeft: (
        <TouchableOpacity onPress={() => params.navigation.goBack()} style={{marginLeft: 10}}>
          <Ionicons name="ios-arrow-dropleft" size={28} color='#34bbed'/>
        </TouchableOpacity>
      ),
      headerRight: (
        <TouchableOpacity onPress={() => params.refresh()} style={{marginRight: 10}}>
          <Ionicons name="ios-refresh" size={28} color='#34bbed'/>
        </TouchableOpacity>
      ),
    };
  }
  componentWillMount() {
    this.props.navigation.setParams({ navigation: this.props.navigation, refresh: this.props.refreshIntegrationData });
  }
  sendDappUrlMessage = (dappUrl, dappMessage) => {
    if (dappUrl) {
      this.props.setDappMessage(dappMessage)
      this.props.setDappUrl(dappUrl)
      this.props.navigation.goBack()
    }
  }
  render () {
    const blockusignData = {
      'relay.id-1532144113901' : {
        title : 'Apartment Lease',
        description : '',
        author : 'pbj.id',
        avatar: 'https://gaia.blockstack.org/hub/12ELFuCsjCx5zxVDyNxttnYe9VLrRbLuMm/0/avatar-0',
        decryptable : {
          user : 'TBD',
          key : 'Blockusign',
        },
        fileUrl : '',
      },
      'relay.id-1532196940159' : {
        title : '401K Plan Restructure',
        description : '',
        author : 'alexc.id',
        avatar: 'https://gaia.blockstack.org/hub/1GHZbCnbufz53Skb79FwnwuedW4Hhe2VhR/0/avatar-0',
        decryptable : {
          user : 'TBD',
          key : 'Blockusign',
        },
        fileUrl : '',
      },
      'relay.id-1532197099770' : {
        title : 'Insurance Claim Reiumbursment',
        description : '',
        author : 'relay.id',
        avatar: 'https://gaia.blockstack.org/hub/1CdAz6hrRA2Uf51QAaTZBD1z7xeZfZ1Wiz//avatar-0',
        decryptable : {
          user : 'TBD',
          key : 'Blockusign',
        },
        fileUrl : '',
      },
    }
    let graphiteCards = []
//    TODO: check for integrationError
//    const integrationError = this.props.dappError
    let graphiteData = undefined
    try {
      graphiteData = this.props.dappData['Graphite']
    } catch (error) {
      // Suppress--check for defined
      console.log('INFO(DappData::render): Graphite data undefined.')
    }
    if (graphiteData) {
    // if (graphiteData && !integrationError) {
      for (const item in graphiteData) {
        const data = graphiteData[item]
        const {title, description, author, fileUrl, profile, avatar} = data
        graphiteCards.push(
          <ListItem
            key={item}
            roundAvatar
            title={title}
            subtitle={author}
            avatar={{uri: avatar}}
            onPress={() => this.sendDappUrlMessage(fileUrl, data)}
          />
        )
      }
    }
    let blockusignCards = []
    for (const item in blockusignData) {
      const data = blockusignData[item]
      const {title, description, author, fileUrl, profile, avatar} = data
      blockusignCards.push(
        <ListItem
          key={item}
          roundAvatar
          title={title}
          disabled
          subtitle={author}
          avatar={{uri: avatar}}
          onPress={() => this.sendDappUrlMessage(fileUrl, data)}
        />
      )
    }
    return (
      <View style={{flex: 1, backgroundColor: '#fff'}}>
        <Divider style={{ backgroundColor: '#34bbed', height: 8 }} />
        <List>
          <ListItem
            key={0}
            title={'Graphite Docs'}
            subtitle={'Decentralized G-Suite'}
            avatar={GraphiteIcon}
            hideChevron={true}
          />
          {graphiteCards}
        </List>
        <Divider style={{ backgroundColor: '#34bbed', height: 8 }} />
        <List>
          <ListItem
            key={1}
            disabled
            title={'Blockusign'}
            subtitle={'Decentralized Document Signing'}
            avatar={BlockSignIcon}
            hideChevron={true}
          />
          {blockusignCards}
        </List>
        <Divider style={{ backgroundColor: '#34bbed', height: 8 }} /><List>
          <ListItem
            key={1}
            disabled
            title={'Cryptocracy'}
            subtitle={'Decentralized Voluntary Associations'}
            avatar={CryptoIcon}
            hideChevron={true}
          />
        </List>
      </View>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    dapp: DappSelectors.getDapp(state),
    dappUrl: DappSelectors.getDappUrl(state),
    dappError: DappSelectors.getDappError(state),
    dappData: DappSelectors.getDappData(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setDappUrl: (dappUrl) => dispatch(DappActions.setDappUrl(dappUrl)),
    setDappData: (dappData) => dispatch(DappActions.setDappData(dappData)),
    setDappMessage: (dappMessage) => dispatch(DappActions.setDappMessage(dappMessage)),
    refreshIntegrationData: () => dispatch(DappActions.refreshIntegrationData())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DappData)
