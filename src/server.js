const http = require('http');

const mailer = require('./mailer.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const onRequest = (req, res) => {
  // console.log('Request Received');
  res.end();
};

http.createServer(onRequest).listen(port);

if (false) {
  mailer.sendEmail();
}

// mailer.sendEmail("stashablank@gmail.com", "Test Email", "Hi there!");
