import React from 'react';
import { AsyncStorage, Button, View, ListView, StyleSheet, Text, TouchableHighlight } from 'react-native';
import TouchableRow from './contacts/Row';
import Header from './contacts/Header';
import Footer from './contacts/Footer';
import SectionHeader from './contacts/SectionHeader';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  separator: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#8E8E8E',
  },
});
const stock = 'https://react.semantic-ui.com/assets/images/wireframe/white-image.png'
const demoData = [
  {
    name: {
      first: 'Daniel',
      last: 'Alvarez',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Albert',
      last: 'Bjorn',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/matt.jpg',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Mathew',
      last: 'Leinart',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/matthew.png',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Elliot',
      last: 'Baker',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/elliot.jpg',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Steve',
      last: 'Sanders',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/steve.jpg',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Molly',
      last: 'Thomas',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/molly.png',
    },
    text: "hello"
  },
  {
    name: {
      first: 'Jenny',
      last: 'Davis',
    },
    picture: {
      large: 'https://react.semantic-ui.com/assets/images/avatar/large/jenny.jpg',
    },
    text: "hello"
  },
]

class ConversationScreen extends React.Component {

  static navigationOptions = {
    header: null,
  };

  constructor(props) {
    super(props);

    const getSectionData = (dataBlob, sectionId) => dataBlob[sectionId];
    const getRowData = (dataBlob, sectionId, rowId) => dataBlob[`${rowId}`];

    const ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
      sectionHeaderHasChanged : (s1, s2) => s1 !== s2,
      getSectionData,
      getRowData,
    });

    const { dataBlob, sectionIds, rowIds } = this.formatData(demoData);
    this.state = {
      dataSource: ds.cloneWithRowsAndSections(dataBlob, sectionIds, rowIds),
    };
  }

  formatData(data) {
    // We're sorting by alphabetically so we need the alphabet
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Need somewhere to store our data
    const dataBlob = {};
    const sectionIds = [];
    const rowIds = [];

    // Each section is going to represent a letter in the alphabet so we loop over the alphabet
    for (let sectionId = 0; sectionId < alphabet.length; sectionId++) {
      // Get the character we're currently looking for
      const currentChar = alphabet[sectionId];

      // Get users whose first name starts with the current letter
      const users = data.filter((user) => user.name.first.toUpperCase().indexOf(currentChar) === 0);

      // If there are any users who have a first name starting with the current letter then we'll
      // add a new section otherwise we just skip over it
      if (users.length > 0) {
        // Add a section id to our array so the listview knows that we've got a new section
        sectionIds.push(sectionId);

        // Store any data we would want to display in the section header. In our case we want to show
        // the current character
        dataBlob[sectionId] = { character: currentChar };

        // Setup a new array that we can store the row ids for this section
        rowIds.push([]);

        // Loop over the valid users for this section
        for (let i = 0; i < users.length; i++) {
          // Create a unique row id for the data blob that the listview can use for reference
          const rowId = `${sectionId}:${i}`;

          // Push the row id to the row ids array. This is what listview will reference to pull
          // data from our data blob
          rowIds[rowIds.length - 1].push(rowId);

          // Store the data we care about for this row
          dataBlob[rowId] = users[i];
        }
      }
    }

    return { dataBlob, sectionIds, rowIds };
  }

  render() {
    return (
      <ListView
        style={styles.container}
        dataSource={this.state.dataSource}
        renderRow={(data) => <TouchableRow data={data} navigation={this.props.navigation} />}
        renderHeader={() => <Header navigation={this.props.navigation} />}
      />
    );
  }
}

export default ConversationScreen;