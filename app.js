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
var usernames = ['ElleGuest', 'chloeguest92', 'Elisemorgan789', 'LiamFrailing', 'MWyatt4', 'andy_elliott95', 'Ryantaylor1996', 'iAlexDean', 'JimmyMcArthur2', 'jakeypowell95'];
var username = usernames[3];

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
        count: 3200,
        include_rts: false
    }

    var txt = '';

    T.get('statuses/user_timeline', params, gotData);

    function gotData(err, data, response){
        
        for (var i = 0; i < data.length; i++) {
            txt += data[i].text;           
        }

        console.log(txt);
        
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

            console.log((tonals.length / totalWords) * 100 );
            console.log((emotions.negative / tonals.length) * 100 );
            console.log((emotions.surprise / tonals.length) * 100 );
            console.log((emotions.anger / tonals.length) * 100 );
            console.log();
            console.log((emotions.fear / tonals.length) * 100 );
            console.log((emotions.trust / tonals.length) * 100 );
            console.log((emotions.joy / tonals.length) * 100 );
            console.log((emotions.anticipation / tonals.length) * 100 );

            var dominanceCounter = 0;
            var steadinessCounter = 0;

            // Dominance OR Steadiness skew analysis - high emotion
            var emotivePercent = (tonals.length / totalWords) * 100;
            if( (Math.round(emotivePercent - 9)) >= 0){
                dominanceCounter++;
            } else if ((Math.round(emotivePercent - 7)) <= 0){ 
                steadinessCounter++; }

            // Dominance OR Steadiness skew analysis - high negativity
            var negativityPercent = (emotions.negative / tonals.length) * 100;
            if( Math.round((negativityPercent - 38)) >= 0){
                dominanceCounter++;
            } else if ((Math.round(negativityPercent - 32)) <= 0){ 
                steadinessCounter++; }

            // Dominance OR Steadiness skew analysis - high surprise
            var surprisePercent = (emotions.surprise / tonals.length) * 100;
            if( Math.round((surprisePercent - 9)) >= 0){
                dominanceCounter++;
            } else if ((Math.round(surprisePercent - 7)) <= 0){ 
                steadinessCounter++; }

            // Dominance OR Steadiness skew analysis - high anger
            var angerPercent = (emotions.anger / tonals.length) * 100;
            if( Math.round((angerPercent - 11)) >= 0){
                dominanceCounter++;
            } else if ((Math.round(angerPercent - 9)) <= 0){ 
                steadinessCounter++; }

            console.log('Dominance: ' + dominanceCounter + ' && ' + 'Steadiness: ' + steadinessCounter);

            var influenceCounter = 0;
            var complianceCounter = 0;

            // Influence OR Compliance skew analysis - low fear
            var fearPercent = (emotions.fear / tonals.length) * 100;
            if( Math.round((fearPercent - 9)) <= 0){
                influenceCounter++;
            } else if ((Math.round(fearPercent - 11)) >= 0){ 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - high trust
            var trustPercent = (emotions.trust / tonals.length) * 100;
            if( Math.round((trustPercent - 19)) >= 0){
                influenceCounter++;
            } else if ((Math.round(trustPercent - 15)) <= 0){ 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - high joy
            var joyPercent = (emotions.joy / tonals.length) * 100;
            if( Math.round((joyPercent - 22)) >= 0){
                influenceCounter++;
            } else if ((Math.round(trustPercent - 18)) <= 0){ 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - high anticipation
            var anticipationPercent = (emotions.anticipation / tonals.length) * 100;
            if( Math.round((anticipationPercent - 18)) >= 0){
                influenceCounter++;
            } else if ((Math.round(trustPercent - 14)) <= 0){ 
                complianceCounter++; }

            console.log('Influence: ' + influenceCounter + ' && ' + 'Compliance: ' + complianceCounter);

            /* Percentage skew towards dominance or steadiness 
            var emotiveWordSkew = (Math.round( (tonals.length / totalWords) * 100 )) - 8;
            var emotiveVariationSkew = Math.round(Math.abs( (emotions.positive - emotions.negative) /  (emotions.positive + emotions.negative) * 100 )) - 16;

            /* conditions for DOMINANCE: 
                - High % of emotive words relative to total word count
                - High % of emotional variation (difference between pos/neg word count is low suggesting emotional swings)
            if(Math.round(tonals.length / totalWords) > 0.08 && 
                Math.round(Math.abs(emotions.positive - emotions.negative) / (emotions.positive + emotions.negative)) <= 0.16){
                console.log("Dominance: YES");
            } else { console.log("Dominance: NO"); }

            /* conditions for INFLUENCE: 
                - High % of trust words relative to tonal word count
                - High % of anticipation words relative to tonal word count 
                - High % of joy words relative to tonal word count
            if(Math.round(emotions.trust / tonals.length) > 0.13 && Math.round(emotions.fear / tonals.length) <= 0.1){
                console.log("Influence: YES");
            } else { console.log("Influence: NO"); }

            /* conditions for STEADINESS: 
                - Low % of emotional variation (difference between pos/neg word count)
                - High % of joy relative to tonal word count
            if(Math.round(tonals.length / totalWords) <= 0.08 && 
                Math.round(Math.abs(emotions.positive - emotions.negative) / (emotions.positive + emotions.negative)) > 0.16){
                console.log("Steadiness: YES");
            } else { console.log("Steadiness: NO"); }

            /* conditions for COMPLIANCE: 
                - Low % of trust words relative to tonal word count
                - High % of fear words relative to tonal word count
            if(Math.round(emotions.trust / tonals.length) <= 0.13 && Math.round(emotions.fear / tonals.length) > 0.1){
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