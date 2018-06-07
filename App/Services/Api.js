// a library to wrap and simplify api calls
import apisauce from 'apisauce'

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

  const getUserProfile = (username) => api.get(`/v1/users/${username}`)

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
    getUserProfile
  }
}

// our "constructor"
const notification = (baseURL = 'https://fcm.googleapis.com/fcm/send', token) => {


  // curl --header "Content-Type: application/json" \
  //   --header "Authorization: key=fb_server_key" \
  //   "https://fcm.googleapis.com/fcm/send" \
  //   -d '{"notification": {"title": "New Message", "sound": "default"},
  //   "priority": "high",
  //   "to": "user_device_token"}'
  // ------
  // STEP 1
  // ------
  //
  // Create and configure an apisauce-based api object.
  //
  const fb_server_key = 'AAAAhdS8lMY:APA91bEdMbEj2Qw4Xj7HXYzsuZTzrDrnyAWBlPVbSK76kkxlmWls24MUAoQ6oBUTO36LnSfTT3kByFLrP_tAavQQyDaWYn5bFefG7bA1_u3EIqtyOkHk5naQBRGnTNBT7WSVbU9uO6gD'
  const api = apisauce.create({
    // base URL is read from the "constructor"
    baseURL,
    // here are some default headers
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Authorization': `key=${fb_server_key}`,
    },
    data: {
      "notification": {"title": "New Message", "sound": "default"},
      "priority": "high",
      "to": token,
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
  notification
}
