const http = require('http');
const urlLib = require('url');
const query = require('querystring');

const htmlHandler = require('./htmlHandler');
const jsonHandler = require('./jsonHandler');
const dbHandler = require('./dbHandler.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handleGet = (req, res, url) => {
  const params = query.parse(url.query);
  switch (url.pathname) {
    case '/':
      htmlHandler.getIndex(req, res);
      break;
    case '/style.css':
      htmlHandler.getStyle(req, res);
      break;
      /* case '/script.js':
      htmlHandler.getScript(req, res);
      break; */
    case '/getEvents':
      jsonHandler.getEvents(req, res, params);
      break;
    default:
      htmlHandler.getNotReal(req, res);
      break;
  }
};

const handleHead = (req, res, url) => {
  if (url.pathname === '/getEvents') {
    jsonHandler.getEventsMeta(req, res);
  } else {
    jsonHandler.notFoundMeta(req, res);
  }
};

const handlePost = (req, res, url) => {
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

    switch (url.pathname) {
      case '/postEvent':
        jsonHandler.postEvent(req, res, bodyParams);
        break;
      case '/updateEvent':
        jsonHandler.updateEvent(req, res, bodyParams);
        break;
      case '/sendEmailReminder':
        jsonHandler.sendEmail(req, res, bodyParams, true);
        break;
      case '/sendTextReminder':
        jsonHandler.sendText(req, res, bodyParams);
        break;
      default:
        res.statusCode = 400;
        res.end('Client Error: Data could not be posted.');
        break;
    }
  });
};

const handleDelete = (req, res, url) => {
  switch (url.pathname) {
    case '/deleteEvent':
      jsonHandler.deleteEvent(req, res, query.parse(url.query));
      break;
    default:
      res.statusCode = 400;
      res.end('Client Error: Data could not be deleted.');
      break;
  }
};

const authenticate = (req, res, parsedUrl, next) => {
  const parsedCookies = {};

  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      const cookieParts = cookies[i].split('=');

      // Voodoo magic! Object destructuring syntax is weird
      const { 0: cookieName, 1: cookieKey } = cookieParts;
      parsedCookies[cookieName] = cookieKey;
    }
  }

  if (!parsedCookies.id) {
    // Silly Heroku, using proxies to obscure ip addresses!
    let ipAddress = req.headers['x-forwarded-for'];

    if (ipAddress) {
      const addresses = ipAddress.split(',');
      ipAddress = addresses[addresses.length - 1];
    } else {
      ipAddress = req.connection.remoteAddress;
    }

    const userID = `${ipAddress}${new Date().getTime()}`;
    res.setHeader('Set-Cookie', `id=${userID}`);
    req.user = userID;
  } else {
    req.user = parsedCookies.id;
  }

  next(req, res, parsedUrl);
};

const methodStruct = {
  GET: handleGet,
  HEAD: handleHead,
  POST: handlePost,
  DELETE: handleDelete,
};

const onRequest = (req, res) => {
  const parsedUrl = urlLib.parse(req.url);

  if (methodStruct[req.method]) {
    authenticate(req, res, parsedUrl, methodStruct[req.method]);
  } else {
    authenticate(req, res, parsedUrl, handleGet);
  }
};

http.createServer(onRequest).listen(port);

dbHandler.connect();

// mailer.sendEmail("stashablank@gmail.com", "Test Email", "Hi there!");
