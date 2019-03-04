/* 
To run application: 
    cd  Documents/'ASTON YEAR 3'/'Individual Project'/Prototype
    node server.js
*/

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const fs = require('fs');
const csvtojson = require ("csvtojson");
const Sentiment = require ('sentiment');
const twit = require ('twit');
const config = require ('./config');
const T = new twit(config);

const app = express()

app.use(express.static('public'));
app.use(express.static('js'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index');
})

app.post('/', function (req, res) { 
  getGender(req.body.username)
  getAgeRange(req.body.username)
  getPersonalityProfile(req.body.username)

  setTimeout(function () {
    if(fs.existsSync('profile.txt')){
      fs.readFile('profile.txt', (err, data) => {
        if (err) throw err;

        var results = data.toString().split(',');
        if(!results.length < 6){
            res.render('results', {username:req.body.username, gender: results[0], age: results[1], dominance: results[2], 
            influence: results[3], steadiness: results[4], compliance: results[5]});
        }
      });
    }
  }, 1000);
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

/**********************************************************************
 * Infer gender from the given username
 **********************************************************************/

 // Determine the gender of the given user
function getGender(username){

  var params = {
      screen_name: username
  }

  T.get('users/show', params, gotData);
  function gotData(err, data, response){
      
      var fullName = data.name.trim();
      var firstName = fullName.split(' ')[0].toLowerCase().trim();
      var results = [];

      var gender = "Gender: ";

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
                          gender = "Gender: " + results[0].Gender + ",";
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
                                  gender = "Gender: " + results[0].Gender + ",";
                              }
                              else {
                                  gender = "Gender: " + results[1].Gender + ",";
                              }
                          }
                          else {
                              // skew not strong enough... cannot classify
                          }
                      }
                  }
                  else {
                      // no matches found in csv
                      gender = "Gender: undetermined,";
                  }
                  // write to a new file named gender.txt
                  fs.writeFile('profile.txt', gender, (err) => {  
                    // throws an error, you could also catch it here
                    if (err) throw err;

                    // success case, the file was saved
                    console.log('Gender saved!');
                  });
          })
  }
}

/**********************************************************************
 * Infer age range from the given username
 **********************************************************************/

// Determine the age range of the given user
function getAgeRange(username){

  var params = {
      screen_name: username,
      count: 3200,
      include_rts: false
  }

  T.get('statuses/user_timeline', params, gotData);
  
  var txt = '';
  var ageRange = '';

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
          ageRange = "Age: 16-30,";
      } else { ageRange = "Age: 30+,"; }

      fs.appendFileSync('profile.txt', ageRange, (err) => {  
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Age saved!');
      });
  }
}

/**********************************************************************
 * Infer personality profile from the given username
 **********************************************************************/

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

          var numMentions = 0;
          for (var i = 0; i < txt.length; i++) {
              if (txt.charAt(i) == "@") {
                 numMentions ++;
              }
          }

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

          fs.appendFileSync('profile.txt', "Dominance: " + Math.round((dominanceCounter / 12) * 100) + "%,", (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;
    
            // success case, the file was saved
            console.log('Dominance score saved!');
          });

          fs.appendFileSync('profile.txt', "Influence: " + Math.round((influenceCounter / 12) * 100) + "%,", (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;
    
            // success case, the file was saved
            console.log('Influence score saved!');
          });

          fs.appendFileSync('profile.txt', "Steadiness: " + Math.round((steadinessCounter / 12) * 100) + "%,", (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;
    
            // success case, the file was saved
            console.log('Steadiness score saved!');
          });

          fs.appendFileSync('profile.txt', "Compliance: " + Math.round((complianceCounter / 12) * 100) + "%", (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;
    
            // success case, the file was saved
            console.log('Compliance score saved!');
          });
      })
  }
}