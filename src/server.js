const http = require('http');
const urlLib = require('url');
const query = require('querystring');

const htmlHandler = require('./htmlHandler');
const jsonHandler = require('./jsonHandler');
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
  if (url.pathname === '/postEvent') {
    const bodyStream = [];

    req.on('error', () => {
      res.statusCode = 400;
      res.end('Client Error: Data could not be posted.');
    });

    req.on('data', (dataChunk) => {
      bodyStream.push(dataChunk);
    });

    req.on('end', () => {
      const bodyString = Buffer.concat(bodyStream).toString();
      const bodyParams = query.parse(bodyString);

      // Make request to store in db here?
      jsonHandler.postEvent(req, res, bodyParams);
    });
  }
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
