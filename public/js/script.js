
$('#tweet-textarea').on('keyup', function(){
  var tweetLength = $('#tweet-textarea').val().length;
  $('#tweet-char').text(140-tweetLength)
});
