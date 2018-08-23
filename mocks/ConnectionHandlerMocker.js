const Async        = require('async');
const Logger       = require('bearcatjs-logger');
const ConnectionHandler = require('../lib/ConnectionHandler');

const web3Config   = {provider: 'wss://rinkeby.infura.io/ws', options: {}};
const mongooseConf = "mongodb://127.0.0.1:27017/watch-dog";
const redisConf    = {host: '127.0.0.1', port: 6379};
const logConfig    = {
  appenders  : {"console": { "type"     : "console"}},
  categories : {"default": { "appenders": ["console"], "level": "DEBUG" }}
};
Logger.configure(logConfig);

const logger       = Logger.getLogger();

const connectionHandler = new ConnectionHandler({mongoose: mongooseConf, redis: redisConf, web3: web3Config}).init();

connectionHandler.quit = (t) => {
  setTimeout(() => {
    connectionHandler.redis.quit();
    connectionHandler.mongodb.close();
    setTimeout(() => process.exit(0), 5e2);
  }, t || 3e3);
};
connectionHandler.close = connectionHandler.quit;

module.exports = {connectionHandler};
