// Dependencies
var express = require("express");
var exphbs  = require('express-handlebars');
var mongoose = require('mongoose');
var cheerio = require('cheerio');
var axios = require("axios");
//var mongojs = require("mongojs");
var app = express();

// If deployed to Heroku, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);





// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});