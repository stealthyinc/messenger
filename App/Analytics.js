// const MAX_QUEUE = 100
const { firebaseInstance } = require('./Engine/firebaseWrapper.js')

class Anonalytics {
  constructor (publicKey = undefined) {
    this.publicKey = publicKey
    this.firAnalytics = firebaseInstance.getFirebaseAnalytics()
    if (process.env.NODE_ENV === 'production') {
      this.aeEnable()
    } else {
      this.aeDisable()
    }
  }

  aeEnable = () => {
    this.firAnalytics.setAnalyticsCollectionEnabled(true)
  }

  aeDisable = () => {
    this.firAnalytics.setAnalyticsCollectionEnabled(false)
  }

  // Homepage Events:
  //
  aeReferral (aReferer) {
    if (aReferer !== undefined) {
      this._storeEvent('referral', aReferer)
    }
  }

  aeVisitContext (aContext) {
    if (aContext !== undefined) {
      this._storeEvent('visitContext', aContext)
    }
  }

  aeLoginWithBlockstack () {
    this._storeEvent('loginWithBlockstackPressed')
  }

  aeCreateAccount () {
    this._storeEvent('createAccountPressed')
  }

  aeSocialMediaLink () {
    this._storeEvent('socialMediaLinkPressed')
  }

  aeFeaturesSection () {
    this._storeEvent('featuresSectionViewed')
  }

  aeFaqSection () {
    this._storeEvent('faqSectionViewed')
  }

  // Improper ID Application Page Events:
  //
  aeGetStealthyId () {
    this._storeEvent('getStealthyIdPressed')
  }

  aeGetBlockstackId () {
    this._storeEvent('getBlockstackIdPressed')
  }

  aeWhyDoINeedAnId () {
    this._storeEvent('whyDoINeedAnIdPressed')
  }

  aeStealthyIdFlow (aPage = undefined, aButtonName = undefined) {
    if (aPage && aButtonName) {
      const eventName = `stealthyIdFlowPage${aPage}${aButtonName}ButtonPressed`
      this._storeEvent(eventName)
    }
  }

  // Proper ID Application Page Events:
  //
  aeLogin () {
    this._storeEvent('loginOccured')
  }

  aePlatformDescription (aPlatformDescription) {
    if (aPlatformDescription !== undefined) {
      this._storeEvent('platformDescription', aPlatformDescription)
    }
  }

  aeLoginContext (aContext) {
    if (aContext !== undefined) {
      this._storeEvent('loginContext', aContext)
    }
  }

  aeSettings (aSetting) {
    if (aSetting) {
      this._storeEvent('settings', aSetting)
    }
  }

  aeMessageSent () {
    this._storeEvent('messageSent')
  }

  aeContactsSearched () {
    this._storeEvent('contactsSearched')
  }

  aeContactAdded () {
    this._storeEvent('contactAdded')
  }

  aeWebRtcConnectionEstablished () {
    this._storeEvent('webRtcConnectionEstablished')
  }

  aeVideoChatButton () {
    this._storeEvent('videoChatButtonPressed')
  }

  aeChatWebRtcError (anError) {
    if (anError) {
      this._storeEvent('chatWebRtcError', anError)
    }
  }

  aeAVWebRtcError (anError) {
    if (anError) {
      this._storeEvent('AVWebRtcError', anError)
    }
  }

  // Private:
  // ////////////////////////////////////////////////////////////////////////////

  // TODO: link ID method (links push reference to encUserId--for after login).
  //

  _storeEvent (anEventName, aString = undefined) {
    try {
      if (anEventName && this.publicKey) {
        // const eventTimeMs = Date.now()
        const AWS_LIMIT = 1000
        const d = new Date()
        const dateStamp = d.toDateString()
        this.firAnalytics.setUserId(this.publicKey)
        if (aString) {
          let awsCleanString = (aString.length >= AWS_LIMIT)
            ? aString.substring(0, AWS_LIMIT - 2)
            : aString
          this.firAnalytics.logEvent(anEventName, {attributes: {data: awsCleanString, id: this.publicKey, dateStamp}})
        } else {
          this.firAnalytics.logEvent(anEventName, {attributes: {id: this.publicKey, dateStamp}})
        }
      }
    } catch (error) {
      // const eventTimeMs = Date.now()
      this.firAnalytics.logEvent('error', error)
    }
  }
}

module.exports = { Anonalytics }
