const Bluebird     = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const Mongoose     = require('mongoose');
const Net          = require('net');
const Web3         = require('web3');
const Logger       = require('bearcatjs-logger');
const redis        = require('redis');
Bluebird.promisifyAll(redis);

const BlockSchema  = require('./Schema/Block.js');
const LogItemSchema = require('./Schema/LogItem.js');
const TxHashSchema = require('./Schema/TxHash.js');
const ContractSchema = require('./Schema/Contract.js');

const logger       = Logger.getLogger('connection-handler');

class ConnectionHandler extends EventEmitter {

  constructor(config) {
    super();

    this.config   = config;

    this.provider = null;
    this.web3     = null;

    this.redis    = null;
    this.mongodb  = null;

    this.Block    = null;  
    this.LogItem  = null;  
    this.TxHash   = null;  
    this.Contract = null;
  }

  init() {
    logger.info("Using Config [ %j ] Env [ %j ]", this.config, process.env);

    this.initWeb3Instance();
    this.initRedisInstance();
    this.initMongoDBInstance();
    this.initMongoDBModel();

    return this;
  }

  getWeb3Instance() {
    return this.web3;
  }

  getRedisInstance() {
    return this.redis;
  }

  getMongoDBInstance() {
    return this.mongodb;
  }

  getMongoDBModel() {
    return {
      Block    : this.Block    ,
      LogItem  : this.LogItem  ,
      TxHash   : this.TxHash   ,
      Contract : this.Contract ,
    };
  }

  initWeb3Instance() {
    if (this.config.web3.provider.indexOf('http') === 0) {
      this.provider = new Web3.providers.HttpProvider(this.config.web3.provider);
    }
    if (this.config.web3.provider.indexOf('ws') === 0) {
      this.provider = new Web3.providers.WebsocketProvider(this.config.web3.provider, this.config.web3.options);
    }
    if (this.config.web3.provider.indexOf('ipc') === this.config.web3.provider.length - 3) {
      this.provider = new Web3.providers.IpcProvider(this.config.web3.provider, Net);
    }

    this.provider.on('connect', (evt) => logger.info('Web3 Socket Status %s', evt.type));
    this.provider.on('error', err => {
      logger.error('%j Web3 Wss Connection Error', new Date(), err);
      process.exit(125);
    });
    this.provider.on('end', (...argv) => {
      logger.error('%j Web3 Wss Connection End %s', new Date(), evt.type);
      process.exit(126);
    });
    
    this.web3 = new Web3(this.provider);
  }

  initRedisInstance() {
    const defaultRedisConfig = {
      host: '127.0.0.1',
      port: 6379,
      // password: null,
      // db: null,
      // rename_commands: {KEYS: "MATCH_KEYS"}
  
      return_buffers: false,
      detect_buffers: false,
      socket_keepalive: true,
      no_ready_check: false,
      enable_offline_queue: true,
      retry_unfulfilled_commands: false,
      disable_resubscribing: false,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with an individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    };
  
    const redisConfig = Object.assign({}, defaultRedisConfig, this.config.redis || {});
  
    this.redis = redis.createClient(redisConfig);
  
    this.redis.on('connect', () => {
      logger.debug('Redis Connecting...');
    });
    this.redis.on('ready', () => {
      logger.info('Redis Connected Ready With Config [ %j ]', redisConfig);
    });
    this.redis.on('end', () => {
      logger.debug('Redis End');
    });
    this.redis.on('reconnecting', (...argv) => {
      // {
      //   delay: 100,
      //   attempt: 1,
      //   error: null,
      //   total_retry_time: 0
      //   times_connected: 1
      // }
      logger.debug('Redis Reconnecting %j ...', ...argv);
    });
    this.redis.on('warning', txt => {
      logger.error('Redis Warning %s ', txt);
    });
    this.redis.on('error', err => {
      logger.error('Redis Error %s ', err.message, err);
    });
  }
  
  
  initMongoDBInstance() {
    const mongoConfig = {
      autoReconnect     : true,
      reconnectTries    : Number.MAX_VALUE,
      reconnectInterval : 3000,
      useNewUrlParser   : true
    };
  
    this.mongodb = Mongoose.createConnection(this.config.mongoose, mongoConfig);
  
    this.mongodb.on('connecting', () => {
      logger.debug('MongoDB Connecting...');
    });
    this.mongodb.on('error', errMsg => {
      logger.error('MongoDB Connection Error: ', errMsg);
    });
    this.mongodb.on('connected', () => {
      logger.debug('MongoDB Connected!');
    });
    this.mongodb.on('reconnect', () => {
      logger.debug('MongoDB Reconnect!');
    });
    this.mongodb.on('reconnected', () => {
      logger.debug('MongoDB Reconnected!');
    });
    this.mongodb.on('disconnected', () => {
      logger.debug('MongoDB Disconnected!');
    });
    this.mongodb.once('open', logger.info.bind(logger, 'MongoDB Open With Config [ %j ]', this.config.mongoose));
  }

  initMongoDBModel() {
    this.Block    = this.mongodb.model('Block'    , BlockSchema    );
    this.LogItem  = this.mongodb.model('LogItem'  , LogItemSchema  );
    this.TxHash   = this.mongodb.model('TxHash'   , TxHashSchema   );
    this.Contract = this.mongodb.model('Contract' , ContractSchema );
  }

}

module.exports = ConnectionHandler;
