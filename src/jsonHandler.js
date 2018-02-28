// Import custom modules
const dbHandler = require('./dbHandler.js');
const mailer = require('./mailer.js');

// A general purpose response function that can send a regular or meta response
const respond = (metaFlag, req, res, statusCode, data) => {
  // Write the header
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });

  // If this is a meta response, stop here and send the response
  if (metaFlag) {
    res.end();
    return;
  }

  // Write data and send the response
  res.write(JSON.stringify(data));
  res.end();
};

// Filter out unauthorized events from an event list
const filterUnauthorizedEvents = (user, data) => data.events.filter((event) => {
  // If the event is private and the requester didn't create the event, filter it out
  if (!event.event_private || event.event_creator === user) {
    return true;
  }
  return false;
});

// Filter out unwanted events from an event list
const applyCustomFilter = (filter, data) => data.events.filter((event) => {
  // Either filter out private or public events (default does not filter)
  if (filter === 'private') {
    return event.event_private;
  } else if (filter === 'public') {
    return !event.event_private;
  }
  return true;
});

// Search for a string in the title / description of an event and filter out non-matches
const applySearchFilter = (search, data) => data.events.filter((event) => {
  // If a search term exists, examine the title and description
  if (search && search !== '') {
    const searchLower = search.toLowerCase();
    const title = event.event_title.toLowerCase();
    const description = event.event_description.toLowerCase();
    return title.indexOf(searchLower) > -1 || description.indexOf(searchLower) > -1;
  }
  return true;
});

// Sort event results by data and time
const sortResults = (sortCommand, data) => data.events.sort((a, b) => {
  // Create new date objects
  const dateA = new Date(a.event_date);
  const dateB = new Date(b.event_date);
  let timeA = a.event_time;
  let timeB = b.event_time;

  // If time is not defined for an event, assume it starts at 0:00 (midnight)
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

  // If the dates should be in ascending order
  if (sortCommand === 'date-asc') {
    // Compare just the dates
    const result = dateA.getTime() - dateB.getTime();

    // If the dates are equal, compare the hours, and if the hours are equal, compare the minutes
    if (result === 0) {
      const timeResult = timeA[0] - timeB[0];

      if (timeResult === 0) {
        return timeA[1] - timeB[1];
      }
      return timeResult;
    }
    return result;
  // Same process as above, but sort by descending order instead
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

// Handle a get events request by querying the database
const getEvents = (req, res, params) => {
  // Delegate to the dbHandler to get events from the database
  dbHandler.getEvents((data) => {
    // On success, filter and sort the date, then send it back to the client
    const authorizedEvents = filterUnauthorizedEvents(req.user, data);
    const filteredEvents = applyCustomFilter(params.filter, { events: authorizedEvents });
    const searchedEvents = applySearchFilter(
      params.search,
      { events: filteredEvents },
    );
    const sortedEvents = sortResults(params.sort, { events: searchedEvents });

    respond(false, req, res, 200, { events: sortedEvents });
  }, () => {
    // On failure, send an error to the client (server-side issue this time)
    const response = {
      id: 'internal',
      message: 'Events could not be retrieved.',
    };

    respond(false, req, res, 500, response);
  });
};

// Handle a meta get events request
const getEventsMeta = (req, res) => {
  // Query the database, return success or failure status codes
  dbHandler.getEvents(() => {
    respond(true, req, res, 200);
  }, () => {
    respond(true, req, res, 500);
  });
};

// Handle a not found meta request by sending a 404 back
const notFoundMeta = (req, res) => {
  respond(true, req, res, 404);
};

// Handle a post event request by parsing the parameters and passing them to dbHandler
const postEvent = (req, res, params) => {
  // Check to make sure all parameters are present, otherwise return a bad request error
  if (!params.title || !params.date || !params.description || !params.privacy) {
    const response = {
      id: 'missingParameters',
      message: 'Post parameters missing! Event title, date, description, and privacy are required.',
    };

    respond(false, req, res, 400, response);
    return;
  }
  // Apend the post's creator to the data set
  const moddedParams = params;
  moddedParams.creator = req.user || undefined;

  // Ask the database to store the event and send either a 201 or a 500 to the client
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

// Handle an update event request by checking the params and delegating to dbHandler
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

  // Update the event, on success return a 204, and on failure return a 500
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

// Handle a request to delete an event
const deleteEvent = (req, res, params) => {
  // Ensure that an event id was provided
  if (!params.id) {
    const response = {
      id: 'missingParameters',
      message: 'Post parameters missing! Event title, date, description, and privacy are required.',
    };

    respond(false, req, res, 400, response);
    return;
  }

  // Ask the database to delete the event corresponding to the given id
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

// Handle a request to send an email reminder
const sendEmail = (req, res, params, lineBreaks) => {
  const event = JSON.parse(params.event);

  // Construct an email or a text based on the lineBreaks paramter
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

  // Ask the mailer to send an email given the provided address, title, and body
  mailer.sendEmail(params.email, emailTitle, emailBody, () => {
    let response = { message: 'Email successfully sent (Check your spam folder)!' };
	
	if(lineBreaks){
		response = { message: 'Email successfully sent (Check your spam folder)!' };
	} else {
		response = { message: 'Text successfully sent!' };
	}

    respond(false, req, res, 200, response);
  }, () => {
    const response = {
      id: 'internal',
      message: 'Reminder could not be sent!',
    };

    respond(false, req, res, 500, response);
  });
};

// Handle a request to send a text reminder
const sendText = (req, res, params) => {
  // Construct the carrier specific email address and send an email without line breaks
  const modifiedParams = params;
  modifiedParams.email = `${params.number}@${params.provider}`;
  sendEmail(req, res, modifiedParams, false);
};

// Export all of the public facing functions
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
