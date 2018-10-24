import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PopupDialog, {
  DialogTitle,
  DialogButton,
  SlideAnimation,
} from 'react-native-popup-dialog';

const slideAnimation = new SlideAnimation({ slideFrom: 'bottom' });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogContentView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationBar: {
    borderBottomColor: '#b5b5b5',
    borderBottomWidth: 0.5,
    backgroundColor: '#ffffff',
  },
  navigationTitle: {
    padding: 10,
  },
  navigationButton: {
    padding: 10,
  },
  navigationLeftButton: {
    paddingLeft: 20,
    paddingRight: 40,
  },
  navigator: {
    flex: 1,
    // backgroundColor: '#000000',
  },
});

export default class Dialog extends React.Component {
  componentDidMount = () => {
    this.slideAnimationDialog.show();
  }
  render() {
    return (
      <View style={{ flex: 1 }}>
        <PopupDialog
          dialogTitle={<DialogTitle title="Popup Dialog - Slide Animation" />}
          ref={(popupDialog) => {
            this.slideAnimationDialog = popupDialog;
          }}
          dialogAnimation={slideAnimation}
          actions={[
            <DialogButton
              text="DISMISS"
              onPress={() => {
                this.slideAnimationDialog.dismiss();
                this.props.closeDialog()
              }}
              key="button-1"
            />,
          ]}
        >
          <View style={styles.dialogContentView}>
            <Text>Slide Animation</Text>
          </View>
        </PopupDialog>
      </View>
    );
  }
}