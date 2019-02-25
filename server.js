const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

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
  console.log(req.body.username);
  res.render('results', {gender: "Male"});
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})