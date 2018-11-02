/* 
To run application: 
    cd  Documents/'ASTON YEAR 3'/'Individual Project'/Prototype
    node app.js
*/

// Node modules required for app
var Sentiment = require('./node_modules/sentiment');
var twit = require('./node_modules/twit');
var config = require('./config');

// Setup twitter connection details
var T = new twit(config);

getTweets();


// Retrieve tweets according to search parameters
function getTweets(){

    var params = {
        q: 'donald trump',
        count: 5
    }

    var txt = '';

    T.get('search/tweets', params, gotData);
    function gotData(err, data, response){
        var tweets = data.statuses;
        for (var i = 0; i < tweets.length; i++) {
            txt += tweets[i].text;           
        }
        runSentiment(txt);
    }
}

/*
// Function to run sentiment analysis on a given string
window.onload = runApplication;

// General application control function
function runApplication(){
    getTweets();
    runSentiment("Cats are stupid.");
}
*/

// Run sentiment analysis on the String provided in param
function runSentiment(text){
    
    var sentiment = new Sentiment();
    var result = sentiment.analyze(text);

    // Round the comparative to 2 decimal places
    var comparative = Math.round(result.comparative * 100) / 100

    var print = "Overall score: " + comparative + "\n" +
        "Positive words: " + result.positive + "\n" +
        "Negative words: " + result.negative + "\n";

    console.log(print);

    //document.getElementById("page").innerHTML = "Overall score: " + comparative +
    //"<br><br>Positive words: " + result.positive +
    //"<br><br>Negative words: " + result.negative;
}