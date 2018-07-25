import React from "react";
import { Image, Linking, StatusBar, StyleSheet, View } from "react-native";
import { Container, H1, Header, Content, Card, CardItem, Thumbnail, Text, Button, Icon, Left, Body, Right } from 'native-base';
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
  render() {
    const { activeUserProfile, contactMgr } = this.props
    if (!activeUserProfile) return null
    const activeContact = contactMgr.getActiveContact()
    if (!activeContact) return null
    const { id, title, image, status } = activeContact
    let nTitle = (title) ? title : ''
    const { profile } = activeUserProfile
    const { account, description } = profile
    const checkDescription = (description) ? description : ''
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
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ContactProfile)
