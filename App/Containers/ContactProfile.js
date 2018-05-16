import React from "react";
import { AppRegistry, Image, StatusBar } from "react-native";
import { Container, Content, Text } from "native-base";
export default class ContactProfile extends React.Component {
  render() {
    return (
      <Container>
        <Content>
          <Image
            square
            style={{
              height: 120,
              alignSelf: "stretch",
              justifyContent: "center",
              alignItems: "center"
            }}
            source={{
              uri: "https://react.semantic-ui.com/assets/images/avatar/large/daniel.jpg"
            }}
          />
          <Text>daniel.id</Text>
        </Content>
      </Container>
    );
  }
}
