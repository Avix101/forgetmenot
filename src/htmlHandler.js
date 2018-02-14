const fs = require('fs');

const index = fs.readFileSync(`${__dirname}/../client/index.html`);
const notFound = fs.readFileSync(`${__dirname}/../client/notFound.html`);

const respond = (req, res, status, contentType, data) => {
  res.writeHead(status, { 'Content-Type': contentType });
  res.write(data);
  res.end();
};

const getIndex = (req, res) => {
  respond(req, res, 200, 'text/html', index);
};

const getNotReal = (req, res) => {
  respond(req, res, 404, 'text/html', notFound);
};

module.exports = {
  getIndex,
  getNotReal,
};
