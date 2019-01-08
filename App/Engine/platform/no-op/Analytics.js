// Does nothing. Just a placeholder for the engine code to permit server
// operations without modifying the engine code.

class Anonalytics {
  constructor (publicKey = undefined) {}

  // Homepage Events:
  //
  aeReferral (aReferer) {}
  aeVisitContext (aContext) {}
  aeLoginWithBlockstack () {}
  aeCreateAccount () {}
  aeSocialMediaLink () {}
  aeFeaturesSection () {}
  aeFaqSection () {}

  // Improper ID Application Page Events:
  //
  aeGetStealthyId () {}
  aeGetBlockstackId () {}
  aeWhyDoINeedAnId () {}
  aeStealthyIdFlow (aPage = undefined, aButtonName = undefined) {}

  // Proper ID Application Page Events:
  //
  aeLogin () {}
  aePlatformDescription (aPlatformDescription) {}
  aeLoginContext (aContext) {}
  aeSettings (aSetting) {}
  aeMessageSent () {}
  aeContactsSearched () {}
  aeContactAdded () {}
  aeWebRtcConnectionEstablished () {}
  aeVideoChatButton () {}
  aeChatWebRtcError (anError) {}
  aeAVWebRtcError (anError) {}
}

module.exports = { Anonalytics }
