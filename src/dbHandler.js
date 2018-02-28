// Import the pg module
const { Client } = require('pg');

let client;
let connected = false;

// Connect a new client to the database
const connect = () => {
  // If the database url isn't present, abort operation
  if (!process.env.DATABASE_URL) {
    return;
  }

  // Create a new client and connect them
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  client.connect();
  connected = true;
};

// Store an event in the database, then call a success or failure callback
const storeEvent = (params, success, failure) => {
  // If not connected, abort operation
  if (!connected) {
    failure();
    return;
  }

  // Build the query
  let query = 'INSERT INTO events ("event_title", "event_date"';
  query = `${query},"event_description", "event_private", "event_creator"`;

  // Construct a buffer containing the params to insert
  const insertBuffer = [
    params.title,
    params.date,
    params.description,
    params.privacy,
    params.creator];

  // Time is an optional parameter and should only be included if it exists
  if (params.time) {
    query = `${query}, "event_time") VALUES ($1, $2, $3, $4, $5, $6)`;
    insertBuffer.push(params.time);
  } else {
    query = `${query}) VALUES ($1, $2, $3, $4, $5)`;
  }

  // Use the connected client to send the query with the values inserted
  client.query(query, insertBuffer, (err) => {
    // If there's an error, run the failure callback otherwise run the success callback
    if (err) {
      failure();
    } else {
      success();
    }
  });
};

// Update an existing event in the database
const updateEvent = (params, success, failure) => {
  if (!connected) {
    failure();
    return;
  }

  // We need to include the existing event's id this time
  const insertBuffer = [
    params.title,
    params.date,
    params.description,
    params.privacy,
    params.id];

  // The query looks a bit different this time around -> UPDATE instead of INSERT
  let query = 'UPDATE events SET ';

  query = `${query} event_title = ($1)`;
  query = `${query}, event_date = ($2)`;
  query = `${query}, event_description = ($3)`;
  query = `${query}, event_private = ($4)`;

  if (params.time) {
    query = `${query}, event_time = ($6)`;
    insertBuffer.push(params.time);
  }

  query = `${query} WHERE event_id = ($5);`;

  client.query(query, insertBuffer, (err) => {
    if (err) {
      failure();
    } else {
      success();
    }
  });
};

// Delete a currently existing event in the database
const deleteEvent = (id, success, failure) => {
  if (!connected) {
    failure();
    return;
  }
  // Simple query, delete by event id
  const query = 'DELETE FROM events WHERE event_id = ($1)';
  const insertBuffer = [id];

  client.query(query, insertBuffer, (err) => {
    if (err) {
      failure();
    } else {
      success();
    }
  });
};

// Get all events currently in the events table
const getEvents = (success, failure) => {
  if (!connected) {
    failure();
    return;
  }

  // Query grabs all rows in the events table
  client.query('SELECT * FROM events', (err, res) => {
    if (err) {
      failure();
      throw err;
    }

    success({ events: res.rows });
  });
};

// Disconnect the client from the database
const disconnect = () => {
  client.end();
  connected = false;
};

// Export public facing functions
module.exports = {
  connect,
  disconnect,
  storeEvent,
  getEvents,
  updateEvent,
  deleteEvent,
};
