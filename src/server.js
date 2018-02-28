// Import node modules
const http = require('http');
const urlLib = require('url');
const query = require('querystring');

// Import custom modules
const htmlHandler = require('./htmlHandler');
const jsonHandler = require('./jsonHandler');
const dbHandler = require('./dbHandler.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Handle get requests by delegating to either the htmlHandler or jsonHandler
const handleGet = (req, res, url) => {
  // Parse the query string
  const params = query.parse(url.query);

  // Based on the users requested path, send the request to the correct handler
  switch (url.pathname) {
    // Sending back files
    case '/':
      htmlHandler.getIndex(req, res);
      break;
    case '/style.css':
      htmlHandler.getStyle(req, res);
      break;
      // API usage
    case '/getEvents':
      jsonHandler.getEvents(req, res, params);
      break;
      // Resource couldn't be found
    default:
      htmlHandler.getNotReal(req, res);
      break;
  }
};

// Handle head requests by delegating to the jsonHandler
const handleHead = (req, res, url) => {
  // The only supported head request is /getEvents,
  // all other requests send back a not found status code
  if (url.pathname === '/getEvents') {
    jsonHandler.getEventsMeta(req, res);
  } else {
    jsonHandler.notFoundMeta(req, res);
  }
};

// Handle post requests by parsing incoming data and then delegating the request
const handlePost = (req, res, url) => {
  const bodyStream = [];

  // If there's an error reading the stream, it's the client's fault
  req.on('error', () => {
    res.statusCode = 400;
    res.end('Client Error: Data could not be posted.');
  });

  // When data is received push it to the bodyStream array
  req.on('data', (dataChunk) => {
    bodyStream.push(dataChunk);
  });

  // This fires when all data from the post request has been received
  req.on('end', () => {
    // Parse the data
    const bodyString = Buffer.concat(bodyStream).toString();
    const bodyParams = query.parse(bodyString);

    // Delegate the request to the jsonHandler and send the parsed data
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
      // Default to a client error
      default:
        res.statusCode = 400;
        res.end('Client Error: Data could not be posted.');
        break;
    }
  });
};

// Handle delete requests and delegate the command to the jsonHandler
const handleDelete = (req, res, url) => {
  switch (url.pathname) {
    case '/deleteEvent':
      jsonHandler.deleteEvent(req, res, query.parse(url.query));
      break;
      // Default to a client error
    default:
      res.statusCode = 400;
      res.end('Client Error: Data could not be deleted.');
      break;
  }
};

// Middleware that recognizes authenticated users, and authenticates unrecognized users
const authenticate = (req, res, parsedUrl, next) => {
  const parsedCookies = {};

  // Parse the cookie that the user sent
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');

    // Grab an object containing the cookie as key and value pairs
    for (let i = 0; i < cookies.length; i++) {
      const cookieParts = cookies[i].split('=');

      // Voodoo magic! Object destructuring syntax is weird
      const { 0: cookieName, 1: cookieKey } = cookieParts;
      parsedCookies[cookieName] = cookieKey;
    }
  }

  // If the client's cookie does not have an id
  if (!parsedCookies.id) {
    // Silly Heroku, using proxies to obscure ip addresses!
    let ipAddress = req.headers['x-forwarded-for'];

    // Grab the user's ip address
    if (ipAddress) {
      const addresses = ipAddress.split(',');
      ipAddress = addresses[addresses.length - 1];
    } else {
      ipAddress = req.connection.remoteAddress;
    }

    // Create a new userId and store it in a cookie that will be passed to the client
    const userID = `${ipAddress}${new Date().getTime()}`;
    res.setHeader('Set-Cookie', `id=${userID}`);
    req.user = userID;
  } else {
    // If the user does have an id in their cookie, set the request's user parameter
    req.user = parsedCookies.id;
  }

  // Move onto the next function
  next(req, res, parsedUrl);
};

// A simple struct that determines which server function should be used for which method
const methodStruct = {
  GET: handleGet,
  HEAD: handleHead,
  POST: handlePost,
  DELETE: handleDelete,
};

// When the server receives a request
const onRequest = (req, res) => {
  // Parse the requested url
  const parsedUrl = urlLib.parse(req.url);

  // If the user requested a valid method, pass them onto authentication
  if (methodStruct[req.method]) {
    authenticate(req, res, parsedUrl, methodStruct[req.method]);
  // An invalid method will be processed as a get request (can return 404 if necessary)
  } else {
    authenticate(req, res, parsedUrl, handleGet);
  }
};

// Create the server
http.createServer(onRequest).listen(port);

// Connect to the database
dbHandler.connect();
