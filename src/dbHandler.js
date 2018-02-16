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
	return false;
  }
  
  let query = `INSERT INTO events ("event_title", "event_date", "event_description", "event_private"`;
  let insertBuffer = [params.title, params.date, params.description, params.privacy];
  
  if(params.time) {
	query = `${query}, "event_time") VALUES ($1, $2, $3, $4, $5)`;
	insertBuffer.push(params.time);
  } else {
	query = `${query}) VALUES ($1, $2, $3, $4)`;
  }
  
  client.query(query, insertBuffer, (err, res) => {
	if(err) {
      failure();
	  console.log(err);
	  return false;
	}
	
	success();
	return true;
  });
};

const getEvents = () => {
  if (!connected) {
	return [];
  }
  
  client.query('SELECT * FROM events', (err, res) => {
	if(err) {
      throw err;
	}	
	
	let events = [];
	
	for(let row of res.rows){
		events.push(JSON.stringify(row));
	}
	
	return events;
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
};
