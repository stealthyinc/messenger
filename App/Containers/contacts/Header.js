import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 30,
    flex: 1,
    paddingHorizontal: 8,
    marginRight: 10,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

const Header = (props) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder="Search..."
      onChangeText={(text) => console.log('searching for ', text)}
    />
    <TouchableOpacity onPress={() => props.navigation.navigate('ChatMenu')}> 
      <Ionicons name="ios-add-circle-outline" size={28} color='#34bbed'/>
    </TouchableOpacity>
  </View>
);

export default Header;