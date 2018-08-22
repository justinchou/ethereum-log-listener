const Bluebird           = require('bluebird');
const Fs                 = require('fs');
const Path               = require('path');
const Logger             = require('bearcatjs-logger');
const EthAbi             = require('ethjs-abi');
const EventEmitter       = require('events').EventEmitter;
const BigNumber          = require('bignumber.js');
const Web3Utils          = require('web3').utils;
const BN                 = Web3Utils.BN;

const logger             = Logger.getLogger('logs-handler');

function loadMetaFromBuild(metaFolder, contractName) {
  let file = Path.join(metaFolder, `${contractName}.json`);
  if (file.indexOf('/') !== 0) { file = '../../' + file; }
  
  let meta;
  try {
    const metaStr = Fs.readFileSync(file, 'utf8');
    meta = JSON.parse(meta);
  } catch (err) {
    logger.error('load %s from folder %s failed', contractName, metaFolder);
    throw err;
  }
  
  if (contractName !== meta.contractName) {
    logger.warn('contractName [ %s ] Is Different From Filename [ %s ]', meta.contractName, contractName);
  }
  
  return meta;
}

function loadAllABIFromBuild(metaFolder) {
  const contracts = {};
  const address2name = {};
  const topic2name = {};

  const files = Fs.readdirSync(metaFolder);

  files.filter(file => {
    const names = file.split('.');
    const extension = names[1];
    return extension === 'json';
  }).map(file => {
    const names = file.split('.');
    const filename = names[0];

    const meta = loadMetaFromBuild(metaFolder, filename);

    contracts[filename] = EthAbi.logDecoder(meta.abi);

    for (let network of meta.networks) {
      if (network && typeof network === 'object' && network.address) {
        this.address2name[network.address] = filename;
      }
    }

    meta.abi.filter(abi => abi.type === 'event').map(abi => {
      const {name, inputs} = abi;
      const args    = inputs.map(input => input.type);
      const hashStr = `${name}(${args.join(',')})`;
      const topic   = Web3Utils.sha3(hashStr);
      logger.debug('Hash [ %s ] Topic [ %s ]', hashStr, topic)
      this.topic2name[topic] = filename;
    });
  });

  return {contracts, address2name, topic2name};
}

function parseLogInfo(log) {
  if (log && Array.isArray(log)) {
    return log.map(value => {
      if (BN.isBN(value)) value = new BigNumber(value).toString();
      else if (value && (Array.isArray(value) || typeof value === 'object')) value = parseLogInfo(value);
      return value;
    });
  }

  if (log && typeof log === 'object') {
    for (let [key, value] of Object.entries(log)) {
      if (BN.isBN(value)) log[key] = new BigNumber(value).toString();
      else if (value && (Array.isArray(value) || typeof value === 'object')) log[key] = parseLogInfo(value);
    }
    return log;
  }
}

class LogsHandler extends EventEmitter {
  constructor (config, web3, skipContractNames, skipEventName) {
    super();

    this.config = config;
    this.web3   = web3;

    this.timesFailedConnections = 0;

    this.contracts    = null;
    this.address2name = null;
    this.topic2name   = null;

    this.skipContractNames = skipContractNames || [];
    this.skipEventName     = skipEventName     || [];
  }

  init() {
    const {contracts, address2name, topic2name} = loadAllABIFromBuild(this.config.contractMetas);
    this.contracts    = contracts;
    this.address2name = address2name;
    this.topic2name   = topic2name;

    logger.info('a2n      len [ %s ] [ %j ] \n', Object.keys(this.address2name).length , this.address2name          );
    logger.info('t2n      len [ %s ] [ %j ] \n', Object.keys(this.topic2name).length   , this.topic2name            );
    logger.info('contract len [ %s ] [ %j ] \n', Object.keys(this.contracts).length    , Object.keys(this.contracts));

    return this;
  }

  async parseLog(contractName, logItem) {
    return new Promise((resolve, reject) => {
      const eventParser = this.contracts[contractName];
      if (!eventParser) reject(new Error('Invalid Contract Name'));

      const logsUtf8 = eventParser(logItem);
      if (logsUtf8.length !== 1) {
        logger.warn('Parsed Logs Length [ %s ] Should Equal 1', logsUtf8.length);
        return reject(new );
      }

      const log = parseLogInfo(logsUtf8[0]);
      logger.debug('contractName: [ %s ] eventName: [ %s ] \nparsedLog: [ %j ] \nlogsList: [ %j ]', contractName, log._eventName, log, logItem);

      if (BN.isBN(logItem.logIndex)) logItem.logIndex = new BigNumber(logItem.logIndex).toNumber();
      if (BN.isBN(logItem.transactionIndex)) logItem.transactionIndex = new BigNumber(logItem.transactionIndex).toNumber();
      if (BN.isBN(logItem.blockNumber)) logItem.blockNumber = new BigNumber(logItem.blockNumber).toNumber();
      log.origin = logItem;

      resolve(log);
    });
  }

  async logRecvier(blockNumber, contractName, log) {
    const parsedLogs = await this.parseLog(contractName, log);
    logger.info('[ ReceiveLog ] Parsed Logs: blockNumber [ %s ] [ %s ] [ %j ]', blockNumber, contractName, parsedLogs);
    this.emit('log', blockNumber, contractName, parsedLogs);
  }

  async logRevert(blockNumber, contractName, log) {
    const parsedLogs = await this.parseLog(contractName, log);
    logger.info('[ RevertLog ] Parsed Logs: blockNumber [ %s ] [ %s ] [ %j ]', blockNumber, contractName, parsedLogs);
    this.emit('revert', blockNumber, contractName, parsedLogs);
  }

  async filterLog(log, parsedLogs) {
    let blockNumber;
    let contractName;
    if (this.address.indexOf(log.address) !== -1) {
      // our log with correct env server
      contractName = this.address2name[log.address]
      if (!parsedLogs[contractName]) parsedLogs[contractName] = [log];
      else parsedLogs[contractName].push(log);

      blockNumber = log.blockNumber;
    } else if (this.topics.indexOf(log.topics[0]) !== -1) {
      // our log without address -> maybe from different env server, need handle more in details.
      contractName = this.topic2name[log.topics[0]];
      if (!parsedLogs[contractName]) parsedLogs[contractName] = [log];
      else parsedLogs[contractName].push(log);

      blockNumber = log.blockNumber;
    }

    // @TODO Filter By Transaction Hash

    return blockNumber;
  }

  async filterLogLopper(log) {
    const parsedLogs  = {};
    let blockNumber = await this.filterLog(log, parsedLogs);

    for (const contractName in parsedLogs) {
      if (!parsedLogs.hasOwnProperty(contractName)) continue;
      if (this.skipContractNames.indexOf(contractName) !== -1) {
        logger.debug('Skip Contract [ %s ]', contractName);
        continue;
      }

      logger.info('[ Producer ] Load Logs blockNumber [ %s ] contractName [ %s ] filterdLogs [ %j ]', blockNumber, contractName, parsedLogs[contractName]);
      if (log.removed) {
        // logger.error('log removed [ %j ]', log);
        await this.logRevert.call(this, blockNumber, contractName, parsedLogs[contractName]);
      } else {
        await this.logRecvier.call(this, blockNumber, contractName, parsedLogs[contractName]);
      }
    }
  }

  subscribeLogInfo(blockNumber) {
    const subscription = this.web3.eth.subscribe('logs', {fromBlock: blockNumber})
      .on("data", log => this.filterLogLopper(log))
      .on("changed", log => this.filterLogLopper(log))
      .on("error", err => {
        logger.error('Get Past Logs With [ %s ] Failed Err:', blockNumber, err);
      });
  }

  pullLogInfo(blockNumber) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getPastLogs({
        fromBlock: Web3Utils.toHex(blockNumber),
        toBlock: Web3Utils.toHex(blockNumber)
      })
      .then(logs => {
        logger.debug('Past Logs %s [ %j ]', logs.length, logs);
        if (Array.isArray(logs) && logs.length > 0)
          logs.forEach(log => this.filterLogLopper(log));

        resolve(logs);
      })
      .catch(err => {
        logger.error('Get Past Logs With [ %s ] Failed Err:', blockNumber, err);
        reject(err);
      });
    });
  }

}

module.exports = LogsHandler;
