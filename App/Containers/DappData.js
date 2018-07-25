import React, { Component } from 'react'
import { ScrollView, Text, WebView } from 'react-native'
import { connect } from 'react-redux'
// Add Actions - replace 'Your' with whatever your reducer is called :)
// import YourActions from '../Redux/YourRedux'
import EngineActions, { EngineSelectors } from '../Redux/EngineRedux'
import { List, ListItem } from 'react-native-elements'
import GraphiteIcon from '../Images/GraphiteIcon.png';

class DappData extends Component {
  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    return {
      headerBackTitle: 'Back',
    };
  }
  sendFileUrlMessage = (fileUrl, dappData) => {
    this.props.sendDappData(dappData)
    this.props.sendFileUrl(fileUrl)
    this.props.navigation.navigate("DappScreen")
  }
  render () {
    const simulatedData = {
      'relay.id-1532144113901' : {
        title : 'Take the Power Back',
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
          onPress={() => this.sendFileUrlMessage(fileUrl, data)}
        />
      )
    }
    return (
      <List>
        <ListItem
          key={0}
          roundAvatar
          title={'Graphite Docs'}
          avatar={GraphiteIcon}
          hideChevron={true}
        />
        {cards}
      </List>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    fileUrl: EngineSelectors.getFileUrl(state),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    sendFileUrl: (fileUrl) => dispatch(EngineActions.sendFileUrl(fileUrl)),
    sendDappData: (dappData) => dispatch(EngineActions.sendDappData(dappData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DappData)
