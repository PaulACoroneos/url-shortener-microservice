const app = require('./express/server');

// listen for requests :)
app.listen(3000, function () {
  console.log('Your app is listening on port 3000');
});