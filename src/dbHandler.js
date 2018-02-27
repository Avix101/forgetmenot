const { Client } = require('pg');

let client;
let connected = false;

const connect = () => {
  if (!process.env.DATABASE_URL) {
    return;
  }

  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  client.connect();
  connected = true;
};

const storeEvent = (params, success, failure) => {
  if (!connected) {
    failure();
    return;
  }

  let query = 'INSERT INTO events ("event_title", "event_date"';
  query = `${query},"event_description", "event_private", "event_creator"`;

  const insertBuffer = [
    params.title,
    params.date,
    params.description,
    params.privacy,
    params.creator];

  if (params.time) {
    query = `${query}, "event_time") VALUES ($1, $2, $3, $4, $5, $6)`;
    insertBuffer.push(params.time);
  } else {
    query = `${query}) VALUES ($1, $2, $3, $4, $5)`;
  }

  client.query(query, insertBuffer, (err) => {
    if (err) {
      failure();
      // console.log(err);
    } else {
      success();
    }
  });
};

const updateEvent = (params, success, failure) => {
  if (!connected) {
    failure();
    return;
  }

  const insertBuffer = [
    params.title,
    params.date,
    params.description,
    params.privacy,
    params.id];

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

const deleteEvent = (id, success, failure) => {
  if (!connected) {
    failure();
    return;
  }
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

const getEvents = (success, failure) => {
  if (!connected) {
    failure();
    return;
  }

  client.query('SELECT * FROM events', (err, res) => {
    if (err) {
      failure();
      throw err;
    }

    success({ events: res.rows });
  });
};

const disconnect = () => {
  client.end();
  connected = false;
};

module.exports = {
  connect,
  disconnect,
  storeEvent,
  getEvents,
  updateEvent,
  deleteEvent,
};
