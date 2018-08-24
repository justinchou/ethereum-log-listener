const Bluebird           = require('bluebird');
const Fs                 = require('fs');
const Path               = require('path');
const Logger             = require('bearcatjs-logger');
const EthAbi             = require('ethjs-abi');
const EventEmitter       = require('events').EventEmitter;
const BigNumber          = require('bignumber.js');
const Web3Utils          = require('web3').utils;
const {loadAllABIFromBuild, parseLogInfo} = require('./Utils');

const logger             = Logger.getLogger('logs-handler');

class LogsHandler extends EventEmitter {
  constructor (config, web3, contracts, address2name, topic2name, topic2event, {
    excludeContractNames = [], 
    excludeEventName = [],
    includeContractNames = [], 
    includeEventName = [],
  } = {}) {
    super();

    this.config = config;
    this.web3   = web3;

    this.timesFailedConnections = 0;

    // contract name -> contract log parser
    this.contracts    = contracts;

    // address -> contract name
    this.address2name = address2name;
    // topic -> contract name
    this.topic2name   = topic2name;

    // topic  -> log event name
    this.topic2event  = topic2event;

    this.excludeContractNames = excludeContractNames ;
    this.excludeEventName     = excludeEventName     ;
    this.includeContractNames = includeContractNames ;
    this.includeEventName     = includeEventName     ;
  }

  init() {
    this.excludeContractNames.map(name => {
      if (this.includeContractNames.includes(name)) throw new Error('Exclude And Include Contract Name Interacts');
    });
    this.excludeEventName.map(name => {
      if (this.includeEventName.includes(name)) throw new Error('Exclude And Include Event Name Interacts');
    });
    return this;
  }

  _checkConnection() {
    if (this.timesFailedConnections > 3) {
      logger.error('%j Web3 Wss Connection PingPong RetryTimes %s', new Date(), this.timesFailedConnections);
      process.exit(127);
    }
  }

  async _parseLog(contractName, logItem) {
    return new Promise((resolve, reject) => {
      const eventParser = this.contracts[contractName];
      if (!eventParser) reject(new Error('Invalid Contract Name'));

      const logsUtf8 = eventParser([logItem]);
      if (logsUtf8.length !== 1) {
        logger.warn('Parsed Logs Length [ %s ] Should Equal 1', logsUtf8.length);
        return reject(new Error('invlaid log length'));
      }

      const log = parseLogInfo(logsUtf8[0]);
      logger.debug('contractName: [ %s ] eventName: [ %s ] \nparsedLog: [ %j ] \nlogsList: [ %j ]', contractName, log._eventName, log, logItem);

      if (Web3Utils.BN.isBN(logItem.logIndex))
        logItem.logIndex = new BigNumber(logItem.logIndex).toNumber();

      if (Web3Utils.BN.isBN(logItem.transactionIndex))
        logItem.transactionIndex = new BigNumber(logItem.transactionIndex).toNumber();

      if (Web3Utils.BN.isBN(logItem.blockNumber))
        logItem.blockNumber = new BigNumber(logItem.blockNumber).toNumber();

      log.origin = logItem;

      resolve(log);
    });
  }

  async _logRecvier(blockNumber, contractName, log) {
    const parsedLog = await this._parseLog(contractName, log);
    logger.info('[ ReceiveLog ] Parsed Logs: blockNumber [ %s ] [ %s ] [ %j ]', blockNumber, contractName, parsedLog);
    if (this.excludeEventName.indexOf(parsedLog._eventName) !== -1) {
      logger.debug('Skip Event [ %s ]', parsedLog._eventName);
      return false;
    }
    this.emit('log', blockNumber, contractName, parsedLog);
    return true;
  }

  async _logRevert(blockNumber, contractName, log) {
    const parsedLog = await this._parseLog(contractName, log);
    logger.info('[ RevertLog ] Parsed Logs: blockNumber [ %s ] [ %s ] [ %j ]', blockNumber, contractName, parsedLog);
    if (this.excludeEventName.indexOf(parsedLog._eventName) !== -1) {
      logger.debug('Skip Event [ %s ]', parsedLog._eventName);
      return false;
    }
    this.emit('revert', blockNumber, contractName, parsedLog);
    return true;
  }

  async _filterLog(log) {
    let blockNumber  = log.blockNumber;
    let contractName = this.address2name[log.address] || this.topic2name[log.topics[0]];
    let eventName    = this.topic2event[log.topics[0]];

    // our log with correct env server
    // our log without address -> maybe from different env server, need handle more in details.
    if (!contractName && !eventName) return false;

    if (contractName && this.excludeContractNames.indexOf(contractName) !== -1) {
      logger.debug('Skip Contract [ %s ]', contractName);
      return false;
    }

    logger.info('[ Producer ] Load Logs #%s contractName [ %s ] eventName [ %s ] filterdLog [ %j ]', blockNumber, contractName, eventName, log);
    if (log.removed) {
      return await this._logRevert.call(this, blockNumber, contractName, log);
    } else {
      return await this._logRecvier.call(this, blockNumber, contractName, log);
    }
  }

  // subscribeLogInfo(blockNumber) {
  //   const subscription = this.web3.eth.subscribe('logs', {fromBlock: blockNumber})
  //     .on("data", log => this._filterLog(log))
  //     .on("changed", log => this._filterLog(log))
  //     .on("error", err => {
  //       logger.error('Past Logs With [ %s ] Failed Err:', blockNumber, err);
  //     });
  // }

  pullLogInfo(blockNumber) {
    return new Promise((resolve, reject) => {
      this._checkConnection();

      const startTime = Date.now();
      const delayTicker = setTimeout(() => this.timesFailedConnections += 1, 2e3); // commonly 200-300ms
      this.web3.eth.getPastLogs({
        fromBlock: Web3Utils.toHex(blockNumber),
        toBlock: Web3Utils.toHex(blockNumber)
      })
      .then(async logs => {
        clearTimeout(delayTicker);
        logger.debug('Past Logs %sms %s [ %j ]', (Date.now() - startTime), logs.length, logs);
        this.timesFailedConnections = 0;

        let filteredLogLength = 0;
        if (Array.isArray(logs) && logs.length > 0) {
          await logs.map(async log => {
            const filteredLog = await this._filterLog(log);
            filteredLogLength += filteredLog ? 1 : 0; 
          });
        }

        resolve(filteredLogLength);
      })
      .catch(err => {
        clearTimeout(delayTicker);
        logger.error('Past Logs %sms Failed #%s Failed Err:', (Date.now() - startTime), blockNumber, err);
        this.timesFailedConnections += 1;

        reject(err);
      });
    });
  }

}

module.exports = LogsHandler;

