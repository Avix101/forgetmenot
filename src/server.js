const http = require('http');
const urlLib = require('url');

const htmlHandler = require('./htmlHandler');
const mailer = require('./mailer.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handleGet = (req, res, url) => {
  switch (url.pathname) {
    case '/':
      htmlHandler.getIndex(req, res);
      break;
    default:
      htmlHandler.getNotReal(req, res);
      break;
  }
};

const handleHead = (req, res, url) => {
  // Placeholder
  htmlHandler.getIndex(req, res, url);
};

const handlePost = (req, res, url) => {
  // Placeholder
  htmlHandler.getIndex(req, res, url);
};

const methodStruct = {
  GET: handleGet,
  HEAD: handleHead,
  POST: handlePost,
};

const onRequest = (req, res) => {
  const parsedUrl = urlLib.parse(req.url);

  if (methodStruct[req.method]) {
    methodStruct[req.method](req, res, parsedUrl);
  } else {
    handleGet(req, res, parsedUrl);
  }
};

http.createServer(onRequest).listen(port);

if (false) {
  mailer.sendEmail();
}

// mailer.sendEmail("stashablank@gmail.com", "Test Email", "Hi there!");
