const EventEmitter = require('EventEmitter');


const utils = require('./../misc/utils.js');


const INVITATION_POLLING_INTERVAL = 10;
const RESPONSE_POLLING_INTERVAL = 5;

class InvitationPolling extends EventEmitter {
  constructor(logger,
              sdpManager,
              contactIds,
              privateKey = undefined,
              logOutput = false) {
    super();
    this.sdpManager = sdpManager;
    this.contactIds = contactIds;
    this.enablePolling = false;
    this.excludedUserIds = [];
    this.privateKey = privateKey;
    this.logger = logger;
    this.logOutput = logOutput;
  }

  // Convert node 'on' method to react 'addListener' method for RN EventEmitter
  on = (eventTypeStr, listenerFn, context) => {
    this.addListener(eventTypeStr, listenerFn, context);
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  stopPolling() {
    this.enablePolling = false;
  }

  updateContactIds(contactIds) {
    this.contactIds = contactIds;
  }

  excludeUserId(aUserId) {
    if (!this.excludedUserIds.includes(aUserId)) {
      this.excludedUserIds.push(aUserId);
    }
  }

  unexcludeUserId(aUserId) {
    const idx = this.excludedUserIds.indexOf(aUserId);
    if (idx !== -1) {
      this.excludedUserIds.splice(idx, 1);
    }
  }

  async pollForSdpInvitations(interval = INVITATION_POLLING_INTERVAL) {
    const d = new Date();
    this.enablePolling = true;

    while (this.enablePolling) {
      const beforePollingMs = d.getTime();
      this.log('invite polling ...');
      // TODO: Tuning of this alg. to take advantage of concurrency.
      //
      const enableDecrypt = ((this.privateKey !== undefined) &&
                             (this.privateKey !== null) &&
                             (this.privateKey !== ''))

      for (const contactId of this.contactIds) {
        if (this.excludedUserIds.includes(contactId)) {
          continue;
        }

        const res = await this.sdpManager.readSdpInvite(contactId);

        // Extra enable polling to block add here
        if (res && !utils.isEmptyObj(res)) {
          this.log('found sdp invitation ...');

          const sdpData = await utils.decryptObj(this.privateKey, res, enableDecrypt)

          if (!this.enablePolling) {
            // Get out of this fn if polling has been disabled (async wait
            // above can cause problems without this.)
            return;
          }

          if (!utils.isEmptyObj(sdpData)) {
            this.emit('received', contactId, sdpData);
          }
        }
      }
      const afterPollingMs = d.getTime();

      const elapsedTimeMs = afterPollingMs - beforePollingMs;
      const sleepForMs = (interval * 1000) - elapsedTimeMs;
      // TODO: assert/throw if negative
      const waitResult = await utils.resolveAfterMilliseconds(sleepForMs);
    }
  }
}


class ResponsePolling {
  constructor(
              logger,
              sdpManager,
              respondent,
              privateKey = undefined,
              logOutput = false,
              interval = RESPONSE_POLLING_INTERVAL,
              timeout = 120) {
    this.sdpManager = sdpManager;
    this.respondent = respondent;
    this.privateKey = privateKey;
    this.interval = interval;
    this.timeout = timeout;
    this.logger = logger;
    this.logOutput = logOutput;
  }

  log(...args) {
    if (this.logOutput) {
      this.logger(...args);
    }
  }

  async _pollForSdpResponse(resolve, reject) {
    let timeout = this.timeout;
    const sleepForMs = (this.interval * 1000);

    const enableDecrypt = ((this.privateKey !== undefined) &&
                           (this.privateKey !== null) &&
                           (this.privateKey !== ''))

    while (timeout >= 0) {
      this.log('response polling ...');
      const res = await this.sdpManager.readSdpResponse(this.respondent);

      if (res && !utils.isEmptyObj(res)) {
        this.log('got sdp response ...');

        const sdpData = await utils.decryptObj(this.privateKey, res, enableDecrypt)

        if (!utils.isEmptyObj(sdpData)) {
          return resolve(sdpData);
        }
        return resolve(undefined);
      }
      this.log(`continuing to check for a response from ${this.respondent}`);

      timeout -= this.interval;

      const waitResult = await utils.resolveAfterMilliseconds(sleepForMs);
    }

    this.log('Timed out; found no sdp response ...');
    return resolve(undefined);
  }

  async pollForSdpResponse() {
    return new Promise(this._pollForSdpResponse.bind(this));
  }
}

module.exports = { InvitationPolling, ResponsePolling };
