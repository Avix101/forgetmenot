const dbHandler = require('./dbHandler.js');

const respond = (metaFlag, req, res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });

  if (metaFlag) {
    res.end();
  }

  res.write(JSON.stringify(data));
  res.end();
};

const filterEvents = (user, data) => {
	return data.events.filter((event) => {
		if(!event.event_private || event.event_creator === user){
			return true;
		}
		return false;
	});
};

const getEvents = (req, res) => {
	dbHandler.getEvents((data) => {
		const events = filterEvents(req.user, data);
		respond(false, req, res, 200, {events});
	}, () => {
		const response = {
			id: 'internal',
			message: 'Events could not be retrieved.',
		};

		respond(false, req, res, 500, response);
	});
};

const postEvent = (req, res, params) => {
  if (!params.title || !params.date || !params.description || !params.privacy) {
    const response = {
      id: 'missingParameters',
      message: 'Post parameters missing! Event title, date, description, and privacy are required.',
    };

    respond(false, req, res, 400, response);
    return;
  }
  
  params.creator = req.user || undefined;

  dbHandler.storeEvent(params, () => {
    const response = { message: 'Event successfully posted' };

    respond(false, req, res, 201, response);
  }, () => {
    const response = {
      id: 'internal',
      message: 'Event could not be posted.',
    };

    respond(false, req, res, 500, response);
  });
};

module.exports = {
  postEvent,
  getEvents,
};
