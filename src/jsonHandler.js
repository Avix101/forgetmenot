const dbHandler = require('./dbHandler.js');
const mailer = require('./mailer.js');

const respond = (metaFlag, req, res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });

  if (metaFlag) {
    res.end();
    return;
  }

  res.write(JSON.stringify(data));
  res.end();
};

const filterEvents = (user, data) => data.events.filter((event) => {
  if (!event.event_private || event.event_creator === user) {
    return true;
  }
  return false;
});

const getEvents = (req, res) => {
  dbHandler.getEvents((data) => {
    const events = filterEvents(req.user, data);
    respond(false, req, res, 200, { events });
  }, () => {
    const response = {
      id: 'internal',
      message: 'Events could not be retrieved.',
    };

    respond(false, req, res, 500, response);
  });
};

const getEventsMeta = (req, res) => {
  dbHandler.getEvents(() => {
    respond(true, req, res, 200);
  }, () => {
    respond(true, req, res, 500);
  });
};

const notFoundMeta = (req, res) => {
  respond(true, req, res, 404);
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
  const moddedParams = params;
  moddedParams.creator = req.user || undefined;

  dbHandler.storeEvent(moddedParams, () => {
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

const updateEvent = (req, res, params) => {
  if (!params.id || !params.title || !params.date || !params.description
  || !params.privacy) {
    const response = {
      id: 'missingParameters',
      message: 'Post parameters missing! Event title, date, description, and privacy are required.',
    };

    respond(false, req, res, 400, response);
    return;
  }

  dbHandler.updateEvent(params, () => {
    respond(true, req, res, 204);
  }, () => {
    const response = {
      id: 'internal',
      message: 'Event could not be updated.',
    };

    respond(false, req, res, 500, response);
  });
};

const deleteEvent = (req, res, params) => {
  if (!params.id) {
    const response = {
      id: 'missingParameters',
      message: 'Post parameters missing! Event title, date, description, and privacy are required.',
    };

    respond(false, req, res, 400, response);
    return;
  }

  dbHandler.deleteEvent(params.id, () => {
    const response = { message: 'Event successfully deleted!' };

    respond(false, req, res, 200, response);
  }, () => {
    const response = {
      id: 'internal',
      message: 'Event could not be deleted.',
    };

    respond(false, req, res, 500, response);
  });
};

const sendEmail = (req, res, params, lineBreaks) => {
  const event = JSON.parse(params.event);
  const emailTitle = `ForgetMeNot Reminder: ${event.event_title}`;

  let emailBody;

  if (lineBreaks) {
    emailBody = 'Hello there! \n\n';
    emailBody = `${emailBody}You requested a reminder for an upcoming event: ${event.event_title}\n\n`;
    emailBody = `${emailBody}This event will be happening on ${event.event_date.split('T')[0]},`;
    emailBody = `${emailBody} and will start: ${event.event_time || 'anytime that day'}.\n\n`;
    emailBody = `${emailBody}Here's a description of what's going on: ${event.event_description}\n\n`;
    emailBody = `${emailBody}We hope you can make it! Don't forget to mark this event on your calendar.\n\n`;
    emailBody = `${emailBody}Sincerely, \n\nThe ForgetMeNot Team`;
  } else {
    emailBody = 'Hello there! ';
    emailBody = `${emailBody}You requested a reminder for an upcoming event: ${event.event_title}. `;
    emailBody = `${emailBody}This event will be happening on ${event.event_date.split('T')[0]},`;
    emailBody = `${emailBody} and will start: ${event.event_time || 'anytime that day'}. `;
    emailBody = `${emailBody}Here's a description of what's going on: ${event.event_description} `;
    emailBody = `${emailBody}We hope you can make it! Don't forget to mark this event on your calendar. `;
    emailBody = `${emailBody}Sincerely, The ForgetMeNot Team`;
  }

  mailer.sendEmail(params.email, emailTitle, emailBody, () => {
    const response = { message: 'Email successfully sent (Check your spam folder)!' };

    respond(false, req, res, 200, response);
  }, () => {
    const response = {
      id: 'internal',
      message: 'Email could not be sent!',
    };

    respond(false, req, res, 500, response);
  });
};

const sendText = (req, res, params) => {
  const modifiedParams = params;
  modifiedParams.email = `${params.number}@${params.provider}`;
  sendEmail(req, res, modifiedParams, false);
};

module.exports = {
  postEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  sendEmail,
  sendText,
  getEventsMeta,
  notFoundMeta,
};
