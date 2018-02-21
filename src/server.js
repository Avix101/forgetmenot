const http = require('http');
const urlLib = require('url');
const query = require('querystring');

const htmlHandler = require('./htmlHandler');
const jsonHandler = require('./jsonHandler');
const mailer = require('./mailer.js');
const dbHandler = require('./dbHandler.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handleGet = (req, res, url) => {
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
		jsonHandler.getEvents(req, res);
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

const authenticate = (req, res, parsedUrl, next) => {
	
	let parsedCookies = {};
	
	if(req.headers.cookie){
		const cookies = req.headers.cookie.split(';');
		
		for(let i = 0; i < cookies.length; i++){
			const cookieParts = cookies[i].split('=');
			parsedCookies[cookieParts[0]] = cookieParts[1];
		}
	}
	
	if(!parsedCookies['id']){
		const userID = `${req.connection.remoteAddress}${new Date().getTime()}`;
		res.setHeader('Set-Cookie',['id', userID]);
		req.user = userID;
	} else {
		req.user = parsedCookies['id'];
	}
	
	next(req, res, parsedUrl);
};

const methodStruct = {
  GET: handleGet,
  HEAD: handleHead,
  POST: handlePost,
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

if (false) {
  mailer.sendEmail();
}

// mailer.sendEmail("stashablank@gmail.com", "Test Email", "Hi there!");
