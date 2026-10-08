const knex = require('knex');
const knexfile = require('../../knexfile');
const env = require('./env');

const config = knexfile[env.nodeEnv] || knexfile.development;
const db = knex(config);

module.exports = db;
