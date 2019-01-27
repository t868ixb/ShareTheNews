var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));
// Set Handlebars.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to the Mongo DB locally or when hosted on heroku
// var MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1/shareTheNews";
// mongoose.connect(MONGODB_URI,{ useNewUrlParser: true });

ONGODB_URI = process.env.MONGODB_URI || "mongodb://sharethenews:sharethenews18!@ds211083.mlab.com:11083/heroku_4gqdmlsr";
mongoose.connect(MONGODB_URI,{ useNewUrlParser: true });

mongodb://<dbuser>:<dbpassword>@ds211083.mlab.com:11083/heroku_4gqdmlsr

// Routes
//route to load the index page

app.get("/", function(req, res) {
  db.Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("index", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  db.Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("save", hbsObject);
  });
});

app.get("/scrapepage", function(req, res) {
  db.Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("/scrapepage", hbsObject);
  });
});



// route for scraping the website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.npr.org/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // grab every h3 article tag
    //example from npr page
    //<h3 class="title">Video Of Kentucky Students Mocking Native American Man Draws Outcry</h3>
    $("h3.title").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .parent("a")
        .text();
      result.link = $(this)
        .parent("a")
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log("adding results" + dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });
    // Send a message to the client
    res.send("Scrape Complete")
    console.log("Screen Scrape Completed!");
    
    //DID NOT WORK res.redirect('/');
    //console.log("Scrape Completed Successfully!")
    //res.redirect("/");
    //res.render("/");
    //alert("Scrape completed successfully");
  });
  res.redirect("/");
});


// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
  //.sort({created: -1}).limit(15)
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Save an article
app.post("/articles/save/:id", function(req, res) {

  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})

  .exec(function(err, doc) {

    if (err) {
      console.log(err);
    }
    else {

      res.send(doc);
    }
  });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {

  db.Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
  
  .exec(function(err, doc) {
    
    if (err) {
      console.log(err);
    }
    else {
      
      res.send(doc);
    }
  });
});

// Create a new note
app.post("/notes/save/:id", function(req, res) {

  var newNote = new db.Note({
    body: req.body.text,
    article: req.params.id
  });
  console.log(req.body)
  
  newNote.save(function(error, note) {
  
  if (error) {
    console.log(error);
  }
  
  else {
    // Update notes by article ID
    db.Article.findOneAndUpdate({ "_id": req.params.id }, {$push: { "notes": note } })
  
    .exec(function(err) {
  
      if (err) {
        console.log(err);
        res.send(err);
      }
      else {
  
        res.send(note);
      }
    });
  }
  });
  });
  
  // Delete a note
  app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
  
  db.Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {
  
  if (err) {
    console.log(err);
    res.send(err);
  }
  else {
    db.Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})
     
      .exec(function(err) {
        
        if (err) {
          console.log(err);
          res.send(err);
        }
        else {
          
          res.send("Note Deleted");
        }
      });
  }
  });
  });





// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
