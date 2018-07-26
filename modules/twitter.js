const   Twit              = require('twit');
const   config            = require('../config');
const   dateFormat        = require("dateformat");
var     T;
const   NB_EL_TO_DISPLAY  = 5;

var     timeline          = [],
        friends           = [],
        dmContacts         = {},   // direct message contacts
        directMessages    = [],
        nbFriends         = 0,
        myId              = '',
        myScreenName      = "",
        myProfileImage    = "",
        myProfileBanner   = "",
        appError          = null;

function authenticate(){
  T = new Twit({
    consumer_key:         config.consumer_key,
    consumer_secret:      config.consumer_secret,
    access_token:         config.access_token,
    access_token_secret:  config.access_token_secret,
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL:            true,     // optional - requires SSL certificates to be valid.
  })
}

// get current user tweets and list tweets objets in the "timeline" array
function fetchTimeline(){
  timeline = [];
  T.get('statuses/user_timeline', { screen_name: myScreenName, count: NB_EL_TO_DISPLAY }, function(err, data, response) {
    if(err){
      setError(err)
    }else{
      for (var i = 0; i < data.length; i++) {
        // get tweet info
        var { text, user, retweet_count, favorite_count ,retweeted_status, created_at } = data[i];
        // get retweet info
        if (retweeted_status) {
          var { user, retweet_count, favorite_count, created_at } = retweeted_status;
        }
        // var twitterDate = parseTwitterDate(new Date(created_at));   // ==> for twitter date format, more cool
        var twitterDate = dateFormat(new Date(created_at),"dd mmm yyyy");
        var { profile_image_url_https, screen_name, name } = user;
        timeline.push({ name, screen_name, profile_image_url_https, twitterDate, text, retweet_count, favorite_count});
      }
    }
  })
}

// list the account the current user is following and list them in the "friends" array
function fetchFriends(){
  friends = [];
  T.get('friends/list', { screen_name: myScreenName, count: NB_EL_TO_DISPLAY },  function (err, data, response) {
    if(err){
      setError(err)
    }else{
      for (var i = 0; i < data.users.length; i++) {
        let { id_str, name, screen_name, profile_image_url_https, following} = data.users[i];
        friends.push({id_str, name, screen_name, profile_image_url_https, following})
      }
    }

  })
}

// list the direct messages exchanges by the current user in the "directMessages" array
// then calls the function "fetchDmContacts" to get the direct message contacts info
function fetchDirectMessages(){
  directMessages = [];
  T.get('direct_messages/events/list', { screen_name: myScreenName },  function (err, data, response) {

    if(err){
      setError(err)
    }else{
      console.log(data.events);
      data.events.map(dm => {
        console.log(`${dm.message_create.sender_id} ${dm.message_create.message_data.text}`);
      });
      const messageSet = [];
      for (var i = 0; i < Math.min(data.events.length, NB_EL_TO_DISPLAY); i++) {
        // var createdAt = parseTwitterDate(parseInt(data.events[i].created_timestamp));  // ==>  twitter date format ==> more cool
        var createdAt = dateFormat(parseInt(data.events[i].created_timestamp),"dd mmm yyyy hh:mm");
        var target = data.events[i].message_create.target.recipient_id+"";
        var sender = data.events[i].message_create.sender_id+"";
        var message = data.events[i].message_create.message_data.text;

        directMessages.push({createdAt,target,sender,message});
      }
      fetchDmContacts(data);
    }
  })
}

// this function gets the direct message contacts info and create an object for each contact and list them in "dmContacts"
// each contact object  in "dmContacts" has a list of direct messages exchanged with the current user
function fetchDmContacts(dmData){
  const recipientIdsSet = new Set();
  dmData.events.map(event =>{
    recipientIdsSet.add(event.message_create.target.recipient_id);
    recipientIdsSet.add(event.message_create.sender_id);
  });
  let recipientIdsString = [...recipientIdsSet].join(',');

  dmContacts = {};

  T.get('users/lookup', {user_id: recipientIdsString },  function (err, data, response) {
    if(err){
      setError(err)
    }else{
      data.map(user => {
        if(user.screen_name !== myScreenName){
          let { id, name, screen_name, profile_image_url_https, profile_banner_url } = user;
          let dm =  directMessages.filter(dm => dm.target == id || dm.sender == id);
          if (dm.length > 0) {
              dmContacts[id] = { name, screen_name, profile_image_url_https, profile_banner_url, messages: dm};
          }
        }
      })
    }
  })
}



// get current user personal twitter info and the fetch tweets, followed accounts and direct messsages
function verifyCredentials(){
  T.get('account/verify_credentials',  function (err, data, response) {
    appError = null;
    if(err){
      setError(err)
    }else{
      let {id_str, screen_name, friends_count, profile_image_url_https, profile_banner_url} = data;
      myId = id_str;
      myScreenName = screen_name;
      myProfileImage = profile_image_url_https;
      myProfileBanner = profile_banner_url;
      nbFriends = friends_count;

      fetchTimeline();                        // fetch tweets
      if(!appError){fetchFriends();}          // fetch followed accounts
      if(!appError){fetchDirectMessages();}   // fetch direct messsages
    }
  });
}

// post tweet in current user timeline
function postTweet(tweet){
  T.post('statuses/update', { status: tweet }, function(err, data, response) {
    console.log("tweet ok");
  })
}

function setError(err){
  appError = err;
}

// NOT USED IN THIS PROJECT but cool for displaying twitter formated date
// from https://stackoverflow.com/questions/6549223/javascript-code-to-display-twitter-created-at-as-xxxx-ago
function parseTwitterDate(tdate) {
    var system_date = new Date(tdate);
    var user_date = new Date();
    var diff = Math.floor((user_date - system_date) / 1000);
    if (diff <= 1) {return "just now";}
    if (diff < 20) {return diff + " seconds ago";}
    if (diff < 40) {return "half a minute ago";}
    if (diff < 60) {return "less than a minute ago";}
    if (diff <= 90) {return "one minute ago";}
    if (diff <= 3540) {return Math.round(diff / 60) + " minutes ago";}
    if (diff <= 5400) {return "1 hour ago";}
    if (diff <= 86400) {return Math.round(diff / 3600) + " hours ago";}
    if (diff <= 129600) {return "1 day ago";}
    if (diff < 604800) {return Math.round(diff / 86400) + " days ago";}
    if (diff <= 777600) {return "1 week ago";}
    return  dateFormat(system_date,"dd mmm yyyy");
}

function getMyScreenName(){
  return myScreenName;
}

function getTimeline(){
  return timeline;
}

function getFriends(){
  return friends;
}

function getNbFriends(){
  return nbFriends;
}

function getDmContacts(){
  return dmContacts;
}

function getMyProfileImage(){
  return myProfileImage;
}

function getMyProfileBanner(){
  return myProfileBanner;
}

function getMyId(){
  return myId;
}

function getAppError(){
  return appError;
}

module.exports.authenticate         = authenticate;
module.exports.verifyCredentials    = verifyCredentials;
module.exports.getTimeline          = getTimeline;
module.exports.getFriends           = getFriends;
module.exports.getDmContacts        = getDmContacts;
module.exports.getNbFriends         = getNbFriends;
module.exports.getMyId              = getMyId;
module.exports.getMyScreenName      = getMyScreenName;
module.exports.getMyProfileImage    = getMyProfileImage;
module.exports.getMyProfileBanner   = getMyProfileBanner;
module.exports.postTweet            = postTweet;
module.exports.getAppError          = getAppError;
