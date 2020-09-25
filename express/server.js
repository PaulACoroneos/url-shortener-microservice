"use strict";

var express = require("express");
var app = express();
const serverless = require("serverless-http");
const bodyParser = require("body-parser");
require("dotenv").config();
var validUrl = require('valid-url');

var router = express.Router();
var mongo = require("mongodb");
var mongoose = require("mongoose");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.DB_URI);

var db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));

db.once("open", () => {
  console.log("MongoDB connection established.");
});

//MONGO SETUP
var Schema = mongoose.Schema;
var UrlModelSchema = new Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true },
});
var UrlModel = mongoose.model("UrlModel", UrlModelSchema);

var router = express.Router();

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));

router.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
router.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

router.post("/api/shorturl/new", async function (req, res) {
  //capture values from body of request
  const originalUrl = req.body.original_url;
  const shortUrl = req.body.short_url;

  //now lets validate original url is a valid url
  if(!validUrl.isUri(originalUrl)) {
    return res.json({ error: "invalid URL" });
  }

  try {
    //okay we got a good URL, lets post it into the DB
    const findOne = await UrlModel.findOne({ originalUrl: originalUrl }); 

    //did we already create a short url for this?
    if (findOne) {
      return res.json({ originalUrl: findOne.originalUrl, shortUrl: findOne.shortUrl });
    }
    const newDocument = new UrlModel({
      originalUrl: originalUrl,
      shortUrl: shortUrl,
    });
    await newDocument.save();
    return res.json({
      originalUrl: newDocument.originalUrl,
      shortUrl: newDocument.shortUrl,
    });
  } catch (err) {
    return res.status(500).json(err);
  }
});

router.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const shortUrl = await UrlModel.findOne({ shortUrl: req.params.short_url });
    //do we even have this shortUrl?
    if (shortUrl) {
      return res.redirect(302, shortUrl.originalUrl);
    } else {
      return res.status(500).json({ error: "invalid short URL" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

app.use("/.netlify/functions/server", router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
