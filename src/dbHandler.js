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

const storeEvent = () => {
  if (connected) {
    connected = !connected;
  }
};

const disconnect = () => {
  client.end();
  connected = false;
};

module.exports = {
  connect,
  disconnect,
  storeEvent,
};
