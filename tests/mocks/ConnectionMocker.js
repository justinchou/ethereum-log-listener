const EventEmitter = require("events").EventEmitter;
const UUID4 = require('uuid').v4;

class Base extends EventEmitter {
  toString() {
    return 'BaseMocker';
  }
  toJson() {
    return '{"name":"BaseMocker"}';
  }
}

class Redis extends Base {
  constructor() {
    super();

    this.keys = {};
  }

  setAsync(key, value, xxnx) {
    if (!xxnx) {
      this.keys[key] = value;
      return 'OK';
    }
    else if (xxnx === 'NX') { 
      if (this.keys[key]) return null;
      
      this.keys[key] = value;
      return 'OK';
    }
    else if (xxnx === 'XX') {
      if (!this.keys[key]) return null;

      this.keys[key] = value;
      return 'OK';
    }
    else {
      return 'ERROR: invalid arguments.'
    }
  }

  existsAsync(key) {
    return this.keys[key] ? 1 : 0;
  }
}

class Mongo extends Base {
  constructor() {
    super();
  }
}

class MongoModel extends Base {
  constructor() {
    super();

    this._mongodb_data = {};
  }

  _id() {
    return UUID4();
  }
 
  save(next) {
    
  }

  findOne(cond, next) {
    
  }

  update(cond, data, next) {

  }

  delete(cond, next) {

  }

}

class ConnectionMocker extends Base {
  constructor(config) {
    super();

    this.config  = config;
    this.redis   = null;
    this.mongodb = null;

    this.Block   = null;
    this.LogItem = null;
    this.TxHash  = null;
  }

  init() {
    console.log("Using Config [ %j ] Env [ %j ]", this.config, process.env);
    this.getRedisInstance();
    this.getMongoDBInstance();  

    return this;
  }

  getRedisInstance() {
    this.redis = new Redis();
  }

  getMongoDBInstance() {
    this.mongodb = new Mongo();

    
  }
}

