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

getProfile();


// Retrieve the given users Twitter profile
function getProfile(){

    var params = {
        screen_name: 'dapperlaughs'
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