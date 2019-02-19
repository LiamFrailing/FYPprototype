/* 
To run application: 
    cd  Documents/'ASTON YEAR 3'/'Individual Project'/Prototype
    node app.js
*/

function init(){
    // Node modules required for app
    var csvtojson = require ("csvtojson");
    var Sentiment = require ('sentiment');
    var twit = require ('twit');
    var config = require ('./config');

    // Setup twitter connection details
    var T = new twit(config);
    var usernames = ['ElleGuest', 'chloeguest92', 'Elisemorgan789', 'LiamFrailing', 'MWyatt4', 'andy_elliott95', 'Ryantaylor1996', 
    'iAlexDean', 'JimmyMcArthur2', 'jakeypowell95', 'Schofe', 'hollywills', 'realDonaldTrump', 'HillaryClinton', 'antmiddleton',
    'Vibeplace', 'saguest67', 'Markjohn_stuart'];
    var username = usernames[1];

    //getGender(username);
    //getPersonalityProfile(username);
    //getAgeRange(username);
}

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
                            console.log("Likely gender: " + results[0].Gender);
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
                                    console.log("Likely gender: " + results[0].Gender);
                                }
                                else {
                                    console.log("Likely gender: " + results[1].Gender);
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

// Determine the age range of the given user
function getAgeRange(username){

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

        const predictAge = require('predictage')
        
        // These are the default and recommended options
        const opts = {  
            'encoding': 'freq',
            'locale': 'GB',
            'logs': 3,
            'max': Number.POSITIVE_INFINITY,
            'min': Number.NEGATIVE_INFINITY,
            'noInt': false,
            'output': 'lex',
            'places': undefined,
            'sortBy': 'lex',
        }
        const age = predictAge(txt, opts)

        if(age.AGE < 30){
            console.log('Likely age range: 16-30');
        } else { console.log('Likely age range: 30+'); }
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
            //console.log(totalWords);
            //console.log(tonals.length);
            //console.log(emotions);
            //console.log((tonals.length / totalWords) * 100);

            var numMentions = 0;
            for (var i = 0; i < txt.length; i++) {
                if (txt.charAt(i) == "@") {
                   numMentions ++;
                }
            }
            //console.log((numMentions / totalWords) * 100 );
            //console.log((emotions.anger / tonals.length) * 100 );
            //console.log((emotions.surprise / tonals.length) * 100 );
            //console.log((emotions.fear / tonals.length) * 100 );
            //console.log((emotions.trust / tonals.length) * 100 );
            //console.log();
            //console.log((emotions.positive / tonals.length) * 100 );
            //console.log((numMentions / totalWords) * 100 );
            //console.log((emotions.anticipation / tonals.length) * 100 );
            //console.log((emotions.joy / tonals.length) * 100 );
            //console.log((emotions.trust / tonals.length) * 100 );
            //console.log((emotions.fear / tonals.length) * 100 );

            var dominanceCounter = 0;
            var steadinessCounter = 0;

            // Dominance OR Steadiness skew analysis - high emotion
            var emotivePercent = (tonals.length / totalWords) * 100;
            if( (Math.round(emotivePercent - 8)) >= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }
            
            // Dominance OR Steadiness skew analysis - high mention count
            var numMentions = 0;
            for (var i = 0; i < txt.length; i++) {
                if (txt.charAt(i) == "@") {
                   numMentions ++;
                }
            }
            var mentionPercent = (numMentions / totalWords) * 100;
            if( (Math.round(mentionPercent - 10)) >= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }
            
            // Dominance OR Steadiness skew analysis - high anger
            var angerPercent = (emotions.anger / tonals.length) * 100;
            if( (Math.round(angerPercent - 10)) >= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }
            
            // Dominance OR Steadiness skew analysis - high surprise
            var surprisePercent = (emotions.surprise / tonals.length) * 100;
            if( (Math.round(surprisePercent - 8)) >= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }

            // Dominance OR Steadiness skew analysis - low fear
            var fearPercent = (emotions.fear / tonals.length) * 100;
            if( (Math.round(fearPercent - 10)) <= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }

            // Dominance OR Steadiness skew analysis - low trust
            var trustPercent = (emotions.trust / tonals.length) * 100;
            if( (Math.round(trustPercent - 17)) <= 0){
                dominanceCounter++;
            } else { 
                steadinessCounter++; }
            
            //console.log('Dominance: ' + dominanceCounter + ' && ' + 'Steadiness: ' + steadinessCounter);

            var influenceCounter = 0;
            var complianceCounter = 0;

            // Influence OR Compliance skew analysis - high positivity
            var positivityPercent = (emotions.positive / tonals.length) * 100;
            if( Math.round((positivityPercent - 66)) >= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - high mention count
            if( (Math.round(mentionPercent - 10)) >= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - high anticipation
            var anticipationPercent = (emotions.anticipation / tonals.length) * 100;
            if( Math.round((anticipationPercent - 16)) >= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }
            
            // Influence OR Compliance skew analysis - high joy
            var joyPercent = (emotions.joy / tonals.length) * 100;
            if( Math.round((joyPercent - 20)) >= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }
            
            // Influence OR Compliance skew analysis - high trust
            var trustPercent = (emotions.trust / tonals.length) * 100;
            if( Math.round((trustPercent - 17)) >= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }

            // Influence OR Compliance skew analysis - low fear
            var fearPercent = (emotions.fear / tonals.length) * 100;
            if( Math.round((fearPercent - 10)) <= 0){
                influenceCounter++;
            } else { 
                complianceCounter++; }
    
            //console.log('Influence: ' + influenceCounter + ' && ' + 'Compliance: ' + complianceCounter);

            console.log('Likely personality profile:');
            console.log("  D: " + (dominanceCounter / 12) * 100);
            console.log("  I: " + (influenceCounter / 12) * 100);
            console.log("  S: " + (steadinessCounter / 12) * 100);
            console.log("  C: " + (complianceCounter / 12) * 100);
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