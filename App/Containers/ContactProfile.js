import React from "react";
import { Image, Linking, StatusBar, StyleSheet, View } from "react-native";
import { Container, H1, Header, Content, Card, CardItem, Thumbnail, Text, Button, Icon, Left, Body, Right } from 'native-base';
import { List, ListItem } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import chatIcon from '../Images/blue512.png';

class ContactProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dApp: {}
    };
  }
  getSocial = (profile) => {
    const list = [];
    if (profile && profile.account) {
      for (const i of profile.account) {
        if (i.service === 'twitter' || i.service === 'facebook') {
          list.push(
            <Button style={{margin: 10}} transparent key={i.service} onPress={() => Linking.openURL(i.proofUrl).catch(err => console.error('An error occurred', err))}>
              <Icon name={`logo-${i.service}`} />
            </Button>
          );
        }
      }
      return (
        <View style={{flexDirection: 'row'}}>
          {list}
        </View>
      )
    }
    return null;
  }
  renderList() {
    const list = [
      {
        name: 'Graphite Docs',
        avatar_url: 'https://image.ibb.co/hde71b/AppIcon.png',
        subtitle: 'Decentralized G-Suite'
      },
      {
        name: 'Blockusign',
        avatar_url: 'https://blockusign.co/assets/imgs/blockusignLogoHiRes.png',
        subtitle: 'Decentralized Docusign'
      },
      {
        name: 'Travelstack',
        avatar_url: 'https://s3.amazonaws.com/uifaces/faces/twitter/ladylexy/128.jpg',
        subtitle: 'Decentralized photo diary'
      },
      {
        name: 'Cryptocracy',
        avatar_url: 'https://raw.githubusercontent.com/cryptocracy/images/master/512x512.png',
        subtitle: 'Decentralized Voluntary Associations'
      },
    ]
    return list.map((item, i) => {
        return (
          <ListItem
            key={i}
            roundAvatar
            title={item.name}
            subtitle={item.subtitle}
            avatar={{uri: item.avatar_url}}
            onPress={() => this.setState({dApp: item})}
          />
        )
      })
  }
  sendFileUrlMessage = (fileUrl, dappData) => {
    this.props.sendDappData(dappData)
    this.props.sendFileUrl(fileUrl)
    this.props.navigation.navigate("DrawerClose")
  }
  renderGraphiteDocs = (dApp, image) => {
    const simulatedData = {
      'relay.id-1532144113901' : {
        title : 'Test Stealthy Integration 2',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/graphite.id-1532369712591',
        version : '',
        appMetadata : {
          title : 'Test Stealthy Integration 2',
          id : '1532144113901',
          updated : '7/21/2018',
          words : '11',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532196940159' : {
        title : 'Delete Facebook Movement Spreads Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532196940159',
        version : '',
        appMetadata : {
          title : 'Delete Facebook Movement Spreads Worldwide',
          id : '1532196940159',
          updated : '7/21/2018',
          words : '23',
          sharedWith : '',
          singleDocIsPublic : 'true',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
      'relay.id-1532197099770' : {
        title : 'Data Breaches on the Rise Worldwide',
        description : '',
        author : 'relay.id',
        decryptable : {
          user : 'TBD',
          key : 'Graphite',
        },
        fileUrl : 'https://app.graphitedocs.com/shared/docs/relay.id-1532197099770',
        version : '',
        appMetadata : {
          title : 'Data Breaches on the Rise Worldwide',
          id : '1532197099770',
          updated : '7/21/2018',
          words : '35',
          sharedWith : '',
          author : 'relay.id',
          tags : '',
          fileType : 'documents',
        },
      },
    }
    let cards = []
    for (const item in simulatedData) {
      const data = simulatedData[item]
      const {title, description, author, fileUrl, profile} = data
      cards.push(
        <ListItem
          key={item}
          roundAvatar
          title={title}
          subtitle={author}
          avatar={{uri: image}}
          onPress={() => this.sendFileUrlMessage(fileUrl, data)}
        />
      )
    }
    return (
      <List>
        <ListItem
          key={0}
          roundAvatar
          title={dApp.name}
          avatar={{uri: dApp.avatar_url}}
          hideChevron={true}
        />
        {cards}
      </List>
    )

  }
  render() {
    const { dApp } = this.state
    const { activeUserProfile, contactMgr } = this.props
    if (!activeUserProfile) return null
    const activeContact = contactMgr.getActiveContact()
    if (!activeContact) return null
    const { id, title, image, status } = activeContact
    let nTitle = (title) ? title : ''
    const { profile } = activeUserProfile
    const { account, description } = profile
    const checkDescription = (description) ? description : ''
    if (dApp.name === 'Graphite Docs') {
      return this.renderGraphiteDocs(dApp, image)
    }
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
              <Image source={{uri: image}} style={{height: 200, width: null, flex: 1}}/>
            </CardItem>
          </Card>
          <H1 style={{textAlign: 'center', marginTop: 10}}>dApp Integrations</H1>
          <List>
            {this.renderList()}
          </List>
        </Content>
      </Container>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    contactMgr: EngineSelectors.getContactMgr(state),
    activeUserProfile: EngineSelectors.getActiveUserProfile(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    sendFileUrl: (fileUrl) => dispatch(EngineActions.sendFileUrl(fileUrl)),
    sendDappData: (dappData) => dispatch(EngineActions.sendDappData(dappData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ContactProfile)
