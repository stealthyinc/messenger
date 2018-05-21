// Safrari (Safari) currently doesn't work--ice failures. Here are things I've
// tried so far (to no avail):
//   - https://github.com/feross/simple-peer/issues/206
//

function getDefaultSimplePeerOpts(initiator = true) {
  return {
    initiator,
    trickle: false,
    reconnectTimer: 100,
    iceTransportPolicy: 'relay',
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
  };
}

function getSimplePeerOpts(initiator = true, anObject = undefined) {
  const simplePeerOpts = module.exports.getDefaultSimplePeerOpts(initiator);

  if (anObject) {
    for (const property in anObject) {
      simplePeerOpts[property] = anObject[property];
    }
  }

  return simplePeerOpts;
}

module.exports = { getDefaultSimplePeerOpts, getSimplePeerOpts };
