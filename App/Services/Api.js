// a library to wrap and simplify api calls
import apisauce from 'apisauce'
const utils = require('./../Engine/misc/utils.js');

// our "constructor"
const create = (baseURL = 'https://core.blockstack.org') => {
  // ------
  // STEP 1
  // ------
  //
  // Create and configure an apisauce-based api object.
  //
  const api = apisauce.create({
    // base URL is read from the "constructor"
    baseURL,
    // here are some default headers
    headers: {
      'Cache-Control': 'no-cache'
    },
    // 10 second timeout...
    timeout: 10000
  })

  // ------
  // STEP 2
  // ------
  //
  // Define some functions that call the api.  The goal is to provide
  // a thin wrapper of the api layer providing nicer feeling functions
  // rather than "get", "post" and friends.
  //
  // I generally don't like wrapping the output at this level because
  // sometimes specific actions need to be take on `403` or `401`, etc.
  //
  // Since we can't hide from that, we embrace it by getting out of the
  // way at this level.
  //
  const getBlockstackContacts = (username) => api.get(`/v1/search?query=${username}`)

  // Legacy endpoint profile search: https://core.blockstack.org/#resolver-endpoints-lookup-user
  const getUserProfile = (username) => api.get(`/v1/users/${username}`)

  // NS (New school) profile search endpoint
  //   - https://core.blockstack.org/#resolver-endpoints-profile-search
  //   - works with all TLDs except '.id', hence we strip that off the username
  //     before passing it as the query.
  //   - endpoint returns multiple results so we comb through that and find the exact match
  //   - we return the specific user's gaia hub for specified app
  const getUserGaiaNS = (username, app = 'https://www_stealthy_im') => {
    // Ensure username doesn't end in tld .id
    const cleanUserName = utils.removeIdTld(username)
    // console.log(`DEBUG(Api.js::getUserGaiaNS): username=${username}, app=${app}, cleanUserName=${cleanUserName}`)
    return api.get(`/v1/search?query=${cleanUserName}`)
    .then((queryResult) => {
      if (queryResult &&
          queryResult.hasOwnProperty('data') &&
          queryResult['data'] &&      // not enough to see if property is there (on timeout, it is null)
          queryResult['data'].hasOwnProperty('results')) {
        for (const result of queryResult['data']['results']) {
          if (!result ||
              !result.hasOwnProperty('fullyQualifiedName') ||
              result['fullyQualifiedName'] !== username) {
            continue
          }

          if (result.hasOwnProperty('profile') &&
              result['profile'].hasOwnProperty('apps') &&
              result['profile']['apps'].hasOwnProperty(app)) {
            return result["profile"]["apps"][app]
          }
        }
      }
      console.log(`INFO(Api.js::getUserGaiaNS): gaia not found for ${username}`)
      return undefined
    })
    .catch((err) => {
      console.log(`ERROR(Api.js::getUserGaiaNS): ${err}`)
      return undefined
    })
  }

  // ------
  // STEP 3
  // ------
  //
  // Return back a collection of functions that we would consider our
  // interface.  Most of the time it'll be just the list of all the
  // methods in step 2.
  //
  // Notice we're not returning back the `api` created in step 1?  That's
  // because it is scoped privately.  This is one way to create truly
  // private scoped goodies in JavaScript.
  //
  return {
    // a list of the API functions from step 2
    getBlockstackContacts,
    getUserProfile,
    getUserGaiaNS
  }
}

const getAccessToken = (baseURL) => {
  const api = apisauce.create({
    // base URL is read from the "constructor"
    baseURL,
    // here are some default headers
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
    },
    // 10 second timeout...
    timeout: 10000
  })

  const token = () => api.get()

  return {
    token
  }
}

// our "constructor"
const notification = (baseURL, token, pk, bearerToken) => {
  // ------
  // STEP 1
  // ------
  //
  // Create and configure an apisauce-based api object.
  //
  // Test this below if shit doesn't work
  // curl -X POST -H "Authorization: Bearer ya29.c.Elr2BS8k3XudE24_ZkKhnwT_MrIiiQkuKBK5proXokDc68aflEuHvdIFOq_1dZFyqYHKBz_5gmAN943iR3NXLkxWk0ahDb1bG857r1aZc3XrY1FHgPeSgkHU7Bs" -H "Content-Type: application/json" -d '{
  // "message":{
  //   "notification": {
  //     "title": "New Message",
  //   },
  //   "data": {
  //    "test": "boobs",
  //   },
  //   "apns": {
  //     "payload": {"aps":{"badge":1,"sound":"default"}},
  //   },
  //   "token": "cKJhfsmPh9I:APA91bH_YPje6gPkob6lyK82EUubDy_XbGjwSnJbEA98wlAGbnCjtLF7QHkDDUkBORoVfRvV-0_iP2d0IR3sTP2RowlFZe4UyVncsChKgSBxDOtuaymcyqz8uPcBm8B5CrnOiB-b8O1pO9zTpUUgABWHcjk8Bx7aeQ"
  //   }
  // }' "https://fcm.googleapis.com/v1/projects/coldmessage-ae5bc/messages:send"

  // console.log("info", baseURL, token, pk, bearerToken)
  const api = apisauce.create({
    // base URL is read from the "constructor"
    baseURL,
    // here are some default headers
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`
    },
    data: {
      "message": {
        "notification": {
          "title": "New Message",
        },
        "data": {
          "pk": pk
        },
        "apns": {
          "payload": {"aps":{"badge":1,"sound":"default"}}
        },
        "token" : token
      }
    },
    // 10 second timeout...
    timeout: 10000
  })

  // ------
  // STEP 2
  // ------
  //
  // Define some functions that call the api.  The goal is to provide
  // a thin wrapper of the api layer providing nicer feeling functions
  // rather than "get", "post" and friends.
  //
  // I generally don't like wrapping the output at this level because
  // sometimes specific actions need to be take on `403` or `401`, etc.
  //
  // Since we can't hide from that, we embrace it by getting out of the
  // way at this level.
  //
  const send = () => api.post()

  // ------
  // STEP 3
  // ------
  //
  // Return back a collection of functions that we would consider our
  // interface.  Most of the time it'll be just the list of all the
  // methods in step 2.
  //
  // Notice we're not returning back the `api` created in step 1?  That's
  // because it is scoped privately.  This is one way to create truly
  // private scoped goodies in JavaScript.
  //
  return {
    // a list of the API functions from step 2
    send,
  }
}

// let's return back our create method as the default.
export default {
  create,
  getAccessToken,
  notification
}
