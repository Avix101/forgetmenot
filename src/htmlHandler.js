// Import file system module
const fs = require('fs');

// Import custom modules
const index = fs.readFileSync(`${__dirname}/../client/index.html`);
const notFound = fs.readFileSync(`${__dirname}/../client/notFound.html`);
const style = fs.readFileSync(`${__dirname}/../client/style.css`);

// A general purpose response method to send back a file
const respond = (req, res, status, contentType, data) => {
  // Write the content type header and send the file
  res.writeHead(status, { 'Content-Type': contentType });
  res.write(data);
  res.end();
};

// Responds with a 200 and the index file
const getIndex = (req, res) => {
  respond(req, res, 200, 'text/html', index);
};

// Responds with a 404 and the notFound file
const getNotReal = (req, res) => {
  respond(req, res, 404, 'text/html', notFound);
};

// Responds with a 200 and the CSS stylesheet
const getStyle = (req, res) => {
  respond(req, res, 200, 'text/css', style);
};

// Export public facing functions
module.exports = {
  getIndex,
  getNotReal,
  getStyle,
};
