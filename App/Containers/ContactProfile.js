import React from "react";
import { AppRegistry, Image, Linking, StatusBar, StyleSheet, View } from "react-native";
import { Container } from "native-base";
import { Avatar, Button, Card, Icon, Text, SocialIcon } from 'react-native-elements'
import { connect } from 'react-redux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'

class ContactProfile extends React.Component {
  getSocial = (profile) => {
    const list = [];
    if (profile && profile.account) {
      for (const i of profile.account) {
        if (i.service === 'hackerNews') {
          list.push(<SocialIcon type="hacker news"  onPress={() => Linking.openURL(i.proofUrl).catch(err => console.error('An error occurred', err))} />);
        } else if (i.service === 'twitter' || i.service === 'facebook' || i.service === 'github') {
          list.push(<SocialIcon type={i.service} onPress={() => Linking.openURL(i.proofUrl).catch(err => console.error('An error occurred', err))} />);
        }
      }
      return (
        <View style={{flexDirection: 'row', alignItems: 'center', margin: 10}}>
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
    const { id, title, image, status } = activeContact
    const { profile } = activeUserProfile
    const { account, description } = profile
    const checkDescription = (description) ? description : ''
    return (
      <Card
        style={styles.container}
        title={`${title} (${id})`}
        image={{ uri: image}}>
        <Text style={{marginBottom: 10}}>
          {checkDescription}
        </Text>
        {this.getSocial(profile)}
        <Button
          icon={<Icon name='heartbeat' type='font-awesome' color='#ffffff' />}
          backgroundColor='green'
          fontFamily='Lato'
          buttonStyle={{borderRadius: 0, marginLeft: 0, marginRight: 0, marginBottom: 0, backgroundColor: status}}
          title={(status === 'green') ? 'ONLINE' : (status === 'yellow') ? 'AWAY' : 'OFFLINE'} />
      </Card>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  containerEmpty: {
    flex: 1,
    paddingTop: 100,
    backgroundColor: 'white',
    alignItems: 'center',
  }
});

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
