// const Config = require('Config');
const utils = require('./utils.js');
import Secrets from 'react-native-config'

// const { Analytics } = require('aws-amplify')

// const cryptoUtils = require('./cryptoUtils.js');

const MAX_QUEUE = 100;

class Anonalytics {
  constructor(aUserId = undefined) {
    this.userId = aUserId;
    this.analyticId = undefined;

    this.firebase = undefined;
    this.analyticsQueue = [];

    this.isProduction = (process.env.NODE_ENV === 'production');
    this.encrypt = this.isProduction;
    this.trackAnalytics = (this.isProduction && this.userId !== 'stealthy.id' && this.userId !== 'pbj.id' && this.userId !== 'alexc.id')
    this.basePath = (this.trackAnalytics) ?
      '/global/analytics/ids' : '/global/development/analytics/ids';

    // if (!this.trackAnalytics) {
      // Analytics.disable();
    // }

    this.password = Secrets.FIREBASE_ENC_KEY;
    if (!this.password && this.isProduction) {
      throw 'Anonalytics requires a db crypto key.';
    }
  }

  // DB Setup:
  // ////////////////////////////////////////////////////////////////////////////
  setDatabase(aFirebase) {
    if (aFirebase) {
      this.firebase = aFirebase;
      if (this.userId) {
        // this.analyticId = (this.encrypt) ?
        //   cryptoUtils.encryptStr(this.userId, this.password) : this.userId;
        this.analyticId = this.userId;
      } else {
        this.analyticId = this.firebase.database().ref(this.basePath).push().key;
      }

      this._storeQueuedEvents();
    } else {
      throw 'Anonalytics requires a valid database.';
    }
  }


  // Events:
  // ////////////////////////////////////////////////////////////////////////////

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
    if (anEventName) {
      const ueEventName = anEventName;  // unencrypted event name.
      // const eventName = (this.encrypt) ?
      //   cryptoUtils.encryptStr(anEventName, this.password) : anEventName;
      const eventName = anEventName;
      const eventTimeMs = Date.now();
      const cleanString = ((aString !== undefined) && (aString !== null)) ?
        utils.cleanPathForFirebase(aString) : undefined;

      if (this.analyticsQueue.length < MAX_QUEUE) {
        this.analyticsQueue.push({
          eventName,
          ueEventName,
          eventTimeMs,
          cleanString,
        });
      }

      if (this.firebase) {
        this._storeQueuedEvents();
      }
    }
  }

  _storeQueuedEvents() {
    while (this.analyticsQueue.length > 0) {
      const eventObj = this.analyticsQueue.shift();

      const path = `${this.basePath}/${this.analyticId}/${eventObj.eventName}`;
      const cleanPath = utils.cleanPathForFirebase(path);
      const ref = this.firebase.database().ref(cleanPath).push();

      if (eventObj.cleanString !== undefined) {
        const AWS_LIMIT = 1000;
        let awsCleanString = (eventObj.cleanString.length >= AWS_LIMIT) ?
          eventObj.cleanString.substring(0, AWS_LIMIT -2) :
          eventObj.cleanString;

        ref.set({ time: eventObj.eventTimeMs, data: eventObj.cleanString });
        // Analytics.record(eventObj.ueEventName, {data: awsCleanString});
      } else {
        ref.set({ time: eventObj.eventTimeMs });
        // Analytics.record(eventObj.ueEventName, {time: eventObj.eventTimeMs});
      }
    }
  }
}

module.exports = { Anonalytics };
