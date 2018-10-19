import { Analytics } from 'aws-amplify';
import Gun from 'gun/gun.js' // or use the minified version 'gun/gun.min.js'
var gun = new Gun('https://gun-stealthy-db.herokuapp.com/') // or use your own GUN server
const MAX_QUEUE = 100;

class Anonalytics {
  constructor(publicKey = undefined) {
    this.publicKey = publicKey;
    if (process.env.NODE_ENV === 'production') {
      Analytics.enable();
    }
    else {
      Analytics.disable();
    }
  }

  aeEnable() {
    Analytics.enable()
  }

  aeDisable() {
    Analytics.disable()
  }

  // Homepage Events:
  //
  aeReferral(aReferer) {
    if (aReferer !== undefined) {
      this._storeEvent('referral', aReferer);
    }
  }

  aeVisitContext(aContext) {
    if (aContext !== undefined) {
      this._storeEvent('visitContext', aContext);
    }
  }

  aeLoginWithBlockstack() {
    this._storeEvent('loginWithBlockstackPressed');
  }

  aeCreateAccount() {
    this._storeEvent('createAccountPressed');
  }

  aeSocialMediaLink() {
    this._storeEvent('socialMediaLinkPressed');
  }

  aeFeaturesSection() {
    this._storeEvent('featuresSectionViewed');
  }

  aeFaqSection() {
    this._storeEvent('faqSectionViewed');
  }

  // Improper ID Application Page Events:
  //
  aeGetStealthyId() {
    this._storeEvent('getStealthyIdPressed');
  }

  aeGetBlockstackId() {
    this._storeEvent('getBlockstackIdPressed');
  }

  aeWhyDoINeedAnId() {
    this._storeEvent('whyDoINeedAnIdPressed');
  }

  aeStealthyIdFlow(aPage = undefined, aButtonName = undefined) {
    if (aPage && aButtonName) {
      const eventName = `stealthyIdFlowPage${aPage}${aButtonName}ButtonPressed`;
      this._storeEvent(eventName);
    }
  }

  // Proper ID Application Page Events:
  //
  aeLogin() {
    this._storeEvent('loginOccured');
  }

  aePlatformDescription(aPlatformDescription) {
    if (aPlatformDescription !== undefined) {
      this._storeEvent('platformDescription', aPlatformDescription);
    }
  }

  aeLoginContext(aContext) {
    if (aContext !== undefined) {
      this._storeEvent('loginContext', aContext);
    }
  }

  aeSettings(aSetting) {
    if (aSetting) {
      this._storeEvent('settings', aSetting);
    }
  }

  aeMessageSent() {
    this._storeEvent('messageSent');
  }

  aeContactsSearched() {
    this._storeEvent('contactsSearched');
  }

  aeContactAdded() {
    this._storeEvent('contactAdded');
  }

  aeWebRtcConnectionEstablished() {
    this._storeEvent('webRtcConnectionEstablished');
  }

  aeVideoChatButton() {
    this._storeEvent('videoChatButtonPressed');
  }

  aeChatWebRtcError(anError) {
    if (anError) {
      this._storeEvent('chatWebRtcError', anError);
    }
  }

  aeAVWebRtcError(anError) {
    if (anError) {
      this._storeEvent('AVWebRtcError', anError);
    }
  }

  // Private:
  // ////////////////////////////////////////////////////////////////////////////

  // TODO: link ID method (links push reference to encUserId--for after login).
  //

  _storeEvent(anEventName, aString = undefined) {
    try {
      if (anEventName && this.publicKey) {
        const eventTimeMs = Date.now();
        const AWS_LIMIT = 1000;
        const d = new Date();
        const dateStamp = d.toDateString();
        if (aString) {
          let awsCleanString = (aString.length >= AWS_LIMIT) ?
            aString.substring(0, AWS_LIMIT -2) :
            aString;
          Analytics.record({name: anEventName, attributes: {data: awsCleanString, id: this.publicKey, dateStamp}});
          gun.get('analytics').get(this.publicKey).get(eventTimeMs).put({name: anEventName, attributes: {data: awsCleanString, id: this.publicKey, dateStamp}}, function(ack) {
            if (ack.err) {
              console.log("GUN", ack.err)
            }
            console.log("GUN Success")
          });
        }
        else {
          Analytics.record({name: anEventName, attributes: {id: this.publicKey, dateStamp}});
          gun.get('analytics').get(this.publicKey).get(eventTimeMs).put({name: anEventName, attributes: {id: this.publicKey, dateStamp}}, function(ack) {
            if (ack.err) {
              console.log("GUN", ack.err)
            }
            console.log("GUN Success")
          });
        }
        gun.get('analytics').get(this.publicKey).once(function(analytics){
          console.log("GUN Analytics1", analytics)
        })
        gun.get('analytics').get(this.publicKey).get(eventTimeMs).once(function(analytics){
          console.log("GUN Analytics2", analytics)
        })
      }
    }
    catch (error) {
      const eventTimeMs = Date.now();
      gun.get('error').get(eventTimeMs).put({error});
    }
  }
}

module.exports = { Anonalytics };
