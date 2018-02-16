const respond = (metaFlag, req, res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });

  if (metaFlag) {
    res.end();
  }

  res.write(JSON.stringify(data));
  res.end();
};

const postEvent = (req, res, params) => {
  if (!params.title || !params.date || !params.description) {
    const response = {
      id: 'missingParameters',
      message: 'Post paramters missing! Event title, date, and description are required',
    };

    respond(false, req, res, 400, response);
    return;
  }

  // console.log(params);

  const response = { message: 'Event successfully posted' };

  respond(false, req, res, 201, response);
};

module.exports = {
  postEvent,
};
