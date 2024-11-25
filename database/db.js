const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../logger'); // Ensure logger.js is correctly set up

const DB_TYPE = process.env.DB_TYPE; // 'mongodb', 'mysql', or 'sqlite'

let sequelize;
let MongoTicket;
let SequelizeTicket;

async function connectDB() {
  if (DB_TYPE === 'mongodb') {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('Connected to MongoDB');
      // Initialize MongoDB Model
      MongoTicket = require('./models/MongoTicket');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  } else if (DB_TYPE === 'mysql' || DB_TYPE === 'sqlite') {
    try {
      if (DB_TYPE === 'mysql') {
        sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASS, {
          host: process.env.MYSQL_HOST,
          dialect: 'mysql',
          logging: false
        });
      } else if (DB_TYPE === 'sqlite') {
        sequelize = new Sequelize({
          dialect: 'sqlite',
          storage: path.join(__dirname, '..', 'database.sqlite'),
          logging: false
        });
      }

      await sequelize.authenticate();
      logger.info(`Connected to ${DB_TYPE === 'mysql' ? 'MySQL' : 'SQLite'}`);

      // Initialize Sequelize Model
      const defineTicket = require('./models/SequelizeTicket');
      SequelizeTicket = defineTicket(sequelize);

      // Sync models
      await SequelizeTicket.sync();
      logger.info('Sequelize models synced');
    } catch (error) {
      logger.error(`Unable to connect to ${DB_TYPE === 'mysql' ? 'MySQL' : 'SQLite'}:`, error);
      throw error;
    }
  } else {
    logger.error('Invalid DB_TYPE specified in .env');
    throw new Error('Invalid DB_TYPE specified in .env');
  }
}

function getSequelizeTicket() {
  return SequelizeTicket;
}

function getMongoTicket() {
  return MongoTicket;
}

module.exports = { connectDB, getSequelizeTicket, getMongoTicket, DB_TYPE };