PBJ  : "$PBJ_DEVICE_TOKEN"
RELAY: "$REL_DEVICE_TOKEN"


//Check Status
curl -X POST -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/info/$PBJ_DEVICE_TOKEN"

curl -X POST -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/info/$REL_DEVICE_TOKEN"


//Subscribe to Developers Topic
curl -X POST -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/v1/$PBJ_DEVICE_TOKEN/rel/topics/Developers"

curl -X POST -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/v1/$REL_DEVICE_TOKEN/rel/topics/Developers"


//Subscribe to Topic from App
firebase.messaging().subscribeToTopic(topicName);


//Unsubscribe to Topic from App
firebase.messaging().unsubscribeFromTopic(topicName);


//Check Details
curl -X GET -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/info/$PBJ_DEVICE_TOKEN?details=true"

curl -X GET -H "Authorization:key=AIzaSyBXqxGdcWEdt0RcIEtZpRBXcGkFkGKMAYs" -H "Content-Type: application/json" "https://iid.googleapis.com/iid/info/$REL_DEVICE_TOKEN?details=true"


//Send Topic Message

// Check Token Valid
curl "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + $TOKEN

// Get Bearer Token
curl "https://us-central1-coldmessage-ae5bc.cloudfunctions.net/getAccessToken"

// Send Topic Notification
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "message": {
    "topic": "channel.stealthy.id",
    "notification": {
      "title": "New Channel Message",
      "body": "channel.stealthy.id"
    },
  }
}' https://fcm.googleapis.com/v1/projects/coldmessage-ae5bc/messages:send