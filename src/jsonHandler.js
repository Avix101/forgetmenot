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

const filterUnauthorizedEvents = (user, data) => data.events.filter((event) => {
  if (!event.event_private || event.event_creator === user) {
    return true;
  }
  return false;
});

const applyCustomFilter = (filter, data) => data.events.filter((event) => {
  if (filter === 'private') {
    return event.event_private;
  } else if (filter === 'public') {
    return !event.event_private;
  }
  return true;
});

const applySearchFilter = (search, data) => data.events.filter((event) => {
  if (search !== '') {
    const title = event.event_title.toLowerCase();
    const description = event.event_description.toLowerCase();
    return title.indexOf(search) > -1 || description.indexOf(search) > -1;
  }
  return true;
});

const sortResults = (sortCommand, data) => data.events.sort((a, b) => {
  const dateA = new Date(a.event_date);
  const dateB = new Date(b.event_date);
  let timeA = a.event_time;
  let timeB = b.event_time;

  if (timeA) {
    timeA = a.event_time.split(':');
  } else {
    timeA = [0, 0];
  }

  if (timeB) {
    timeB = b.event_time.split(':');
  } else {
    timeB = [0, 0];
  }

  if (sortCommand === 'date-asc') {
    const result = dateA.getTime() - dateB.getTime();

    if (result === 0) {
      const timeResult = timeA[0] - timeB[0];

      if (timeResult === 0) {
        return timeA[1] - timeB[1];
      }
      return timeResult;
    }
    return result;
  } else if (sortCommand === 'date-des') {
    const result = dateB.getTime() - dateA.getTime();

    if (result === 0) {
      const timeResult = timeB[0] - timeA[0];

      if (timeResult === 0) {
        return timeB[1] - timeA[1];
      }
      return timeResult;
    }
    return result;
  }
  return 1;
});

const getEvents = (req, res, params) => {
  dbHandler.getEvents((data) => {
    const authorizedEvents = filterUnauthorizedEvents(req.user, data);
    const filteredEvents = applyCustomFilter(params.filter, { events: authorizedEvents });
    const searchedEvents = applySearchFilter(
      params.search.toLowerCase(),
      { events: filteredEvents },
    );
    const sortedEvents = sortResults(params.sort, { events: searchedEvents });

    respond(false, req, res, 200, { events: sortedEvents });
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
