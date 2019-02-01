/* 
To run application: 
    cd  Documents/'ASTON YEAR 3'/'Individual Project'/Prototype
    node app.js
*/

// Node modules required for app
var csvtojson = require("csvtojson");
var Sentiment = require('./node_modules/sentiment');
var twit = require('./node_modules/twit');
var config = require('./config');

// Setup twitter connection details
var T = new twit(config);
var username = 'dapperlaughs';

getGender(username);
getPersonalityProfile(username);

// Determine the gender of the given user
function getGender(username){

    var params = {
        screen_name: username
    }

    var txt = '';

    T.get('users/show', params, gotData);
    function gotData(err, data, response){
        
        var fullName = data.name.trim();
        var firstName = fullName.split(' ')[0].toLowerCase().trim();
        var results = [];

        const csvFilePath = 'data/gender_labelled_names.csv';

        csvtojson()
            .fromFile(csvFilePath)
            .then((jsonObj)=>{
                    for (var i = 0; i < jsonObj.length; i++) {
                        if(jsonObj[i].Name.toLowerCase() == firstName){
                            console.log(jsonObj[i]);
                            results.push(jsonObj[i]);
                        }
                    }
                    if(results.length == 1){
                        if(results[0].Quantity >= 50){
                            console.log("Likely gender for this name: " + results[0].Gender);
                        }
                        else{
                            // correlation not strong enough... cannot classify
                        }
                    }
                    else if(results.length == 2){
                        if(results[0].Quantity >= 100 || results[1].Quantity >= 100){
                            var first = parseInt(results[0].Quantity);
                            var second = parseInt(results[1].Quantity);
                            var dif = first - second;

                            // make negative difference a positive int
                            if (dif < 0) {
                                dif = dif + (2 * -dif);
                            }

                            // check difference greater than 70% relative to total quantity
                            if ( dif / (first + second ) > 0.7) { 
                                if (first > second){
                                    console.log("Likely gender for this name: " + results[0].Gender);
                                }
                                else {
                                    console.log("Likely gender for this name: " + results[1].Gender);
                                }
                            }
                            else {
                                // skew not strong enough... cannot classify
                            }
                        }
                    }
                    else {
                        // no matches found in csv
                        console.log("No names match the input");
                    }
            })
    }
}

// Determine the personality profile of the given user
function getPersonalityProfile(username){

    var params = {
        screen_name: username,
        count: 3000
    }

    var txt = '';

    T.get('statuses/user_timeline', params, gotData);

    function gotData(err, data, response){
        
        for (var i = 0; i < data.length; i++) {
            txt += data[i].text;           
        }
        
        var sentiment = new Sentiment();
        var result = sentiment.analyze(txt);
        var tonals = result.positive.concat(result.negative);
        const csvFilePath = 'data/NRC-Emotion-Lexicon.csv';
        
        // emotions map for counting the number of time each emotion occurs in the tweets
        var emotions = { 'anger': 0, 'anticipation': 0, 'disgust': 0, 'fear': 0, 'joy': 0, 'sadness': 0, 'surprise': 0, 'trust': 0};

        csvtojson()
        .fromFile(csvFilePath)
        .then((jsonObj)=>{
            for (var i = 0; i < tonals.length; i++) {
                for (var x = 0; x < jsonObj.length; x++) {
                        if(tonals[i].toLowerCase() == jsonObj[x].Word){
                            emotions.anger += parseInt(jsonObj[x].Anger);
                            emotions.anticipation += parseInt(jsonObj[x].Anticipation);
                            emotions.disgust += parseInt(jsonObj[x].Disgust);
                            emotions.fear += parseInt(jsonObj[x].Fear);
                            emotions.joy += parseInt(jsonObj[x].Joy);
                            emotions.sadness += parseInt(jsonObj[x].Sadness);
                            emotions.surprise += parseInt(jsonObj[x].Surprise);
                            emotions.trust += parseInt(jsonObj[x].Trust);
                        }
                }
            }
            console.log(emotions);
        })
    }

}

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