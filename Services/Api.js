// a library to wrap and simplify api calls
import apisauce from 'apisauce'
const utils = require('./../Engine/misc/utils.js');
import RNFetchBlob from 'rn-fetch-blob'

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
      profileData = await translateProfileData(aUserName, preTranslatedProfileData)
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
  const translateProfileData = async (aUserId, theProfileData) => {
    if (aUserId && theProfileData) {
      let profileTranslation = {
        ok: true,
        data: {}
      }
      profileTranslation.data[aUserId] = {}
      profileTranslation.data[aUserId]['profile'] = theProfileData
      const image = theProfileData.image
      const userImage = (image && image[0] && image[0].contentUrl) ?
      image[0].contentUrl : undefined
      if (userImage) {
        await RNFetchBlob.fetch('GET', userImage, {
          // more headers  ..
        })
        .then((res) => {
          let status = res.info().status;
          
          if(status == 200) {
            // the conversion is done in native code
            let base64Str = res.base64()
            // the following conversions are done in js, it's SYNC
            // let text = res.text()
            // let json = res.json()
            profileTranslation.data[aUserId]['base64'] = 'data:image/png;base64,' + base64Str
          } else {
            // handle other status codes
            profileTranslation.data[aUserId]['base64'] = "data:image/png;base64,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…"
          }
        })
        // Something went wrong:
        .catch((errorMessage, statusCode) => {
          // error handling
        })
        return profileTranslation
      }
      else {
        profileTranslation.data[aUserId]['base64'] = "data:image/png;base64,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…"
        return profileTranslation
      }
    }
    else {
      return undefined
    }
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
