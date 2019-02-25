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

  setTimeout(function () {
    if(fs.existsSync('profile.txt')){
      fs.readFile('profile.txt', (err, data) => {
        if (err) throw err;

        var results = data.toString().split(',');

        res.render('results', {username:req.body.username, gender: results[0], age: results[1]});
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

      var gender = '';

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
                          gender = results[0].Gender + ", ";
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
                                  gender = results[0].Gender + ", ";
                              }
                              else {
                                  gender = results[1].Gender + ", ";
                              }
                          }
                          else {
                              // skew not strong enough... cannot classify
                          }
                      }
                  }
                  else {
                      // no matches found in csv
                      gender = "Gender undetermined, ";
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
          ageRange = "\r\nAge range: 16-30";
      } else { ageRange = "\r\nAge range: 30+"; }

      fs.appendFile('profile.txt', ageRange, (err) => {  
        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('Age saved!');
      });
  }
}