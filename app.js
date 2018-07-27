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
app.get('/',(req, res,next) =>{
    twitter.authenticate();
    twitter.verifyCredentials();
    
    setTimeout(function(){
                  let err = twitter.getAppError();
                  if(err){
                    err.status = err.statusCode;
                    next(err);
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
  const err = new Error('Not found');
  err.status = 404;
  next(err);
})

// error handler
app.use((err, req, res, next) => {
  res.locals.error = err;
  res.status(err.status);
  res.render('error');
})


app.listen(PORT, process.env.IP, function(){
  console.log("twitter app server started, listening to port " + PORT );
});
