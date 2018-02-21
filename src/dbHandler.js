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
  }

  let query = 'INSERT INTO events ("event_title", "event_date", "event_description", "event_private", "event_creator"';
  const insertBuffer = [params.title, params.date, params.description, params.privacy, params.creator];

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
    }

    success();
  });
};

const getEvents = (success, failure) => {
  if (!connected) {
    failure();
  }

  return client.query('SELECT * FROM events', (err, res) => {
    if (err) {
		failure();
      throw err;
    }

    success({events: res.rows});
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
};
