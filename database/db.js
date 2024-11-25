const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();

const DB_TYPE = process.env.DB_TYPE; // 'mongodb', 'mysql', or 'sqlite'

async function connectDB() {
  if (DB_TYPE === 'mongodb') {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } else if (DB_TYPE === 'mysql') {
    global.mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      database: process.env.MYSQL_DB,
      password: process.env.MYSQL_PASS,
    });
    console.log('Connected to MySQL');
  } else if (DB_TYPE === 'sqlite') {
    global.sqliteDb = new sqlite3.Database('./database.sqlite', err => {
      if (err) return console.error(err.message);
      console.log('Connected to SQLite');
    });
  } else {
    console.error('Invalid DB_TYPE specified in .env');
  }
}

module.exports = { connectDB };
