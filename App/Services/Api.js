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
  const getBlockstackNames = (username) => getProfileFromNameSearch(username)

  // Legacy endpoint profile search: https://core.blockstack.org/#resolver-endpoints-lookup-user
  //
  // This one is cached--commenting it out:
  //  const getUserProfile = (username) => api.get(`/v1/users/${username}`)
  //
  // Replacing it with the method below
  const getUserProfile = async (aUserName, anAppUrl = 'https://www.stealthy.im') => {
    const methodName = 'Api::getUserProfile'
    let profileData = undefined
    try {
      let preTranslatedProfileData = await getProfileFromNameSearch(aUserName, anAppUrl)
      profileData = translateProfileData(aUserName, preTranslatedProfileData)
    } catch(err) {
      throw `ERROR(${methodName}): failed to get profile data from name search.\n${err}`
    }
    return profileData
  }

  // The different Blockstack end points return different profile data. We really
  // need a gasket/shim to isolate us from that and changes, but for now, due to time
  // constraints I'm translating the profile format to that which all the downstream
  // code depends upon.
  //
  // The Tranlsation
  // ---------------------------------------------------------------------------
  // The profile link returned by querying the name endpoint is returned wrapped as follows:
  // [
  //   {
  //     ...,
  //     "payload": {
  //       ...,
  //       "claim": {
  //         <profile data>
  //       }
  //     }
  //   }
  // ]
  //
  // We need to translate it into this structure, as returned by the .../vw/users/<username> endpoint:
  // {
  //   ok: true,
  //   data: {
    //   <user id> : {
    //     ... *,
    //     "profile": <profile data>
    //     ... *
    //   }
  //   }
  // }
  //
  // * = omitted fields that the downstream code is not using
  // TODO: unify this with work below and elsewhere
  const translateProfileData = (aUserId, theProfileData) => {
    if (aUserId && theProfileData) {
      let profileTranslation = {
        ok: true,
        data: {}
      }
      profileTranslation.data[aUserId] = {}
      profileTranslation.data[aUserId]['profile'] = theProfileData
      return profileTranslation
    }
    return undefined
  }

  // NS (New school) profile search endpoint
  //   - https://core.blockstack.org/#resolver-endpoints-profile-search
  //   - works with all TLDs except '.id', hence we strip that off the username
  //     before passing it as the query.
  //   - endpoint returns multiple results so we comb through that and find the exact match
  //   - we return the specific user's gaia hub for specified app
  const getUserGaiaNS = async (aUserName, anAppUrl = 'https://www.stealthy.im') => {
    const methodName = 'Api::getUserGaiaNS'
    let profileData = undefined
    try {
      profileData = await getProfileFromNameSearch(aUserName, anAppUrl)
      const appUrl = profileData.apps[anAppUrl]
      console.log(`DEBUG(api.js::getUserGaiaNS): gaia app bucket = ${appUrl}`)
      return appUrl
    } catch(err) {
      throw `ERROR(${methodName}): failed to get profile data from name search.\n${err}`
    }
  }

  // getProfileFromNameSearch
  // Notes:
  //   - The name search endpoint handles fully qualified user ids so no need to strip the ends off.
  //   - It returns a data blob containing a link to a user's profile.
  //   - The link to the user's profile is not cached so it will have up to date
  //     settings for multi-player
  //   - The contents of the blob is not consistent. For example, compare the
  //     "zonefile" property for three different ids: alexc.id, alex.stealthy.id,
  //     and prabhaav.id.blockstack.  The url is different so you can't rely on
  //     the "address" field to construct the url from a pattern--you have to parse
  //     for it.
  //   - The zonefile URL seems to be consistently delimited with \". However some
  //     ids, like stealthy.id, return a pile of other strings delimited with \", so
  //     we include https://gaia in our search.
  //   - The profile returned by this endpoint is different than the one returned by
  //     the profile search endpoint. Specifically the app properties use '.' instead
  //     of '_', i.e. 'www.stealthy.im' instead of 'www_stealthy_im'.
  //
  const getProfileFromNameSearch = async (aUserName) => {
    const methodName = 'Api.js::getProfileFromNameSearch'

    let nameResult= undefined
    try {
      nameResult = await api.get(`v1/names/${aUserName}`)
    } catch (err1) {
      // Three attempts.
      // TODO: something more elegant, see comments in engine.js for
      //       _writeConversations.
      try {
        nameResult = await api.get(`v1/names/${aUserName}`)
      } catch (err2) {
        try {
          nameResult = await api.get(`v1/names/${aUserName}`)
        } catch (err3) {
          throw `ERROR(${methodName}): request for data from name endpoint failed.\n${err3}`
        }
      }
    }

    let zonefileUrlMess = undefined
    try {
      zonefileUrlMess = nameResult.data.zonefile
    } catch (err) {
      console.log('Zonefile not in nameResult')
      throw `ERROR(${methodName}): failed to get zonefile data in request returned from name endpoint.\n${err}`
    }

    const zoneFileUrlReResult = /\"https:\/\/.*\"/.exec(zonefileUrlMess)
    let profileUrl = String(zoneFileUrlReResult).replace(/"/g, '')
    if (!profileUrl) {
      throw `ERROR(${methodName}): unable to parse profile URL from zonefile data.`
    }

    let profileUrlResult = undefined
    try {
      profileUrlResult = await api.get(profileUrl)
    } catch (err1) {
      // Three attempts.
      // TODO: something more elegant, see comments in engine.js for
      //       _writeConversations.
      try {
        profileUrlResult = await api.get(profileUrl)
      } catch (err2) {
        try {
          profileUrlResult = await api.get(profileUrl)
        } catch (err3) {
          throw `ERROR(${methodName}): request for profile data from profile URL (${profileUrl}) failed.\n${err3}`
        }
      }
    }
    let profileData = undefined
    if (!profileUrlResult.problem) {
      try {
        profileData = profileUrlResult.data[0].decodedToken.payload.claim
      } catch (err) {
        throw `ERROR(${methodName}): failed to get profile data in request returned from profile URL (${profileUrl}).\n${err}`
      }
    }

    return profileData
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
    getBlockstackNames,
    getUserProfile,
    getUserGaiaNS
  }
}

const Gaia = (gaiaHubUrl='https://gaia.blockstack.org') => {
  const api = apisauce.create({
    baseURL: gaiaHubUrl,
    headers: {'Cache-Control': 'no-cache'},
    timeout: 10000
  })

  // TODO: exponential back off on retry
  const getFileMultiPlayer = async (aUrlPath) => {
    const cleanUrlPath = aUrlPath.replace(`${gaiaHubUrl}/`, '')

    let result = undefined
    try {
      result = await api.get(cleanUrlPath)
    } catch (err1) {
      try {
        result = await api.get(cleanUrlPath)
      } catch (err2) {
        try {
          result = await api.get(cleanUrlPath)
        } catch(err3) {
          throw `ERROR(Api::gaiaMultiPlayerGetFile::getFileFromUrlPath): get failed from ${gaiaHubUrl}/${aUrlPath}`
        }
      }
    }

    return (result && result.hasOwnProperty('data')) ? result.data : undefined
  }

  return {
    getFileMultiPlayer
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

const checkAccessToken = (baseURL) => {
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

  const access = () => api.get()

  return {
    access
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
  //    "test": "blues",
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
  Gaia,
  getAccessToken,
  checkAccessToken,
  notification
}
