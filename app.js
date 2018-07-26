const express           = require('express'),
      bodyParser        = require('body-parser'),
      dateFormat        = require("dateformat");
const PORT              = 5000;
const app               = express();
const twitter           = require("./modules/twitter");

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + '/public'));
app.set('view engine','pug');

// root route
app.get('/',(req, res) =>{
    twitter.authenticate();
    twitter.verifyCredentials(res);
    setTimeout(function(){
                  let err = twitter.getAppError();
                  if(err){
                    res.render('error',{err} )
                  }else{
                    res.render('index', {
                      timeline:       twitter.getTimeline(),
                      friends:        twitter.getFriends(),
                      nbFriends:      twitter.getNbFriends(),
                      dmContacts:     twitter.getDmContacts(),
                      myScreenName:   twitter.getMyScreenName(),
                      myProfileImage: twitter.getMyProfileImage(),
                      myProfileBanner:twitter.getMyProfileBanner(),
                      myId:           twitter.getMyId()
                    });
                  }}, 2000);
});

// for tweet posting
app.post('/tweets', (req,res) =>{
  var { tweetTextarea } = req.body;
  twitter.postTweet(tweetTextarea);
  res.redirect('/');
});

// if url not found
app.use((req,res,next) =>{
  const err = new Error('Url not found');
  err.statusCode = 404;
  res.render('error',{err});
})

app.listen(PORT, process.env.IP, function(){
  console.log("twitter app server started, listening to port " + PORT );
});
