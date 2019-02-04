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
var username = 'chayseimoni';

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
        
        var totalWords = txt.split(' ').length;
        var sentiment = new Sentiment();
        var result = sentiment.analyze(txt);
        var tonals = result.positive.concat(result.negative);
        const csvFilePath = 'data/NRC-Emotion-Lexicon.csv';
        
        // emotions map for counting the number of time each emotion occurs in the tweets
        var emotions = { 'positive': result.positive.length, 'negative': result.negative.length, 'anger': 0, 'anticipation': 0, 'disgust': 0, 'fear': 0, 'joy': 0, 'sadness': 0, 'surprise': 0, 'trust': 0};

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
            console.log(totalWords);
            console.log(tonals.length);
            console.log(emotions);
            console.log("Dominance: " + (tonals.length / totalWords) + " and " + Math.abs(emotions.positive - emotions.negative) /  (emotions.positive + emotions.negative));
            console.log("Influence: " + emotions.trust / tonals.length + " and " + emotions.anticipation / tonals.length + " and " + emotions.joy / tonals.length);
            console.log("Steadiness: " + (tonals.length / totalWords) + " and " + emotions.joy / tonals.length);
            console.log("Compliance: " + emotions.trust / tonals.length + " and " + emotions.fear / tonals.length);

            console.log(tonals.length / totalWords);
            console.log(Math.abs(emotions.positive - emotions.negative) /  (emotions.positive + emotions.negative));
            console.log();
            console.log(emotions.trust / tonals.length);
            console.log(emotions.anticipation / tonals.length);
            console.log(emotions.joy / tonals.length);
            console.log();
            console.log(tonals.length / totalWords);
            console.log(emotions.joy / tonals.length);
            console.log();
            console.log(emotions.trust / tonals.length);
            console.log(emotions.fear / tonals.length);

            /* conditions for DOMINANCE: 
                - High % of emotive words relative to total word count
                - High % of emotional mix (i.e. similarly high pos/neg count) */
            if((tonals.length / totalWords) > 0.08 && 
                Math.abs(emotions.positive - emotions.negative) / (emotions.positive + emotions.negative) < 0.16){
                console.log("Dominance: YES");
            } else { console.log("Dominance: NO"); }

            /* conditions for INFLUENCE: 
                - High % of trust words relative to tonal word count
                - High % of anticipation words relative to tonal word count 
                - High % of joy words relative to tonal word count */
            if(emotions.trust / tonals.length > 0.13 && emotions.anticipation / tonals.length > 0.11 && emotions.joy / tonals.length > 0.16){
                console.log("Influence: YES");
            } else { console.log("Influence: NO"); }

            /* conditions for STEADINESS: 
                - Low % of emotive words relative to total word count
                - High % of joy relative to tonal word count */
                if((tonals.length / totalWords) < 0.08 && 
                (emotions.joy / tonals.length > 0.16)){
                console.log("Steadiness: YES");
            } else { console.log("Steadiness: NO"); }

            /* conditions for COMPLIANCE: 
                - Low % of trust words relative to tonal word count
                - High % of fear words relative to tonal word count */
            if(emotions.trust / tonals.length < 0.13 && emotions.fear / tonals.length > 0.1){
                console.log("Compliance: YES");
            } else { console.log("Compliance: NO"); }
            /* No personality profile identified */
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