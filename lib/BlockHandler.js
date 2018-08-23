const EventEmitter = require('events').EventEmitter;
const Logger       = require('bearcatjs-logger');
const BigNumber    = require('bignumber.js');
const {parseBlockInfo, getTrustBlockNumber} = require('./Utils');

const logger       = Logger.getLogger('block-handler');

class BlockHandler extends EventEmitter {
  constructor(config, web3) {
    super();

    this.config = config;
    this.web3   = web3;

    this.timesFailedConnections = 0;
  }

  init() {
    return this;
  }

  checkConnection() {
    if (this.timesFailedConnections > 3) {
      logger.error('%j Web3 Wss Connection PingPong RetryTimes %s', new Date(), this.timesFailedConnections);
      process.exit(127);
    }
  }

  async getBlockInfo(blockNumber) {
    return new Promise((resolve, reject) => {
      this.checkConnection();

      const startTime = Date.now();
      const delayTicker = setTimeout(() => this.timesFailedConnections += 1, 3e3);
      this.web3.eth.getBlock(blockNumber, true).then(blockInfo => {
        clearTimeout(delayTicker);
        logger.debug('Block Info %sms #%s [ %j ]', (Date.now() - startTime), blockNumber, blockInfo);
        this.timesFailedConnections = 0;

        const parsedBlock = parseBlockInfo(blockInfo);
        this.emit('blockInfo', blockNumber, parsedBlock);
        resolve(parsedBlock);
      }).catch(err => {
        clearTimeout(delayTicker);
        logger.error('Get Block Info %sms #%s Error: ', (Date.now() - startTime), blockNumber, err);
        this.timesFailedConnections += 1;

        reject(err);
      });
    });
  }

  /**
   * Get Block Generated Info
   * @param {Boolean=} withBlockInfo, 'true' then trigger current block info
   *
   * in case of safety, withBlockInfo false, and then getBlockInfo() manully with blockNumber - 6.
   */
  subscribeBlock(withBlockInfo) {
    this.subscriptionBlock = this.web3.eth.subscribe("newBlockHeaders", (err, blockHeader) => {
      // logger.debug("\n\n\nBlockHeader ==== %j ", blockHeader, err);
    })
    .on("data", blockHeader => {
      const blockNumber = blockHeader.number;
      logger.debug("Block Header #%s [ %j ] ", blockNumber, blockHeader);

      const trustBlockNumber = getTrustBlockNumber(blockNumber);
      logger.debug("Trust Block #%s", trustBlockNumber);

      if (withBlockInfo) this.getBlockInfo(trustBlockNumber);
      else this.emit('blockHeader', blockNumber, blockHeader);
    })
    .on("error", err => {
      logger.error("Subscribe Block Header Error: ", err);
    });
  }
  
  pullBlockNumber(withBlockInfo) {
    let interval = setInterval(() => {
      this.checkConnection();

      const startTime = Date.now();
      const delayTicker = setTimeout(() => this.timesFailedConnections += 1, 2e3); // commonly 200-300ms
      this.web3.eth.getBlockNumber()
        .then(blockNumber => {
          clearTimeout(delayTicker);
          logger.debug("Pong Block %sms %s", (Date.now() - startTime), blockNumber);
          this.timesFailedConnections = 0;

          const trustBlockNumber = getTrustBlockNumber(blockNumber);
          logger.debug("Trust Block #%s", trustBlockNumber);

          if (withBlockInfo) this.getBlockInfo(trustBlockNumber);
          else this.emit('blockNumber', blockNumber);
        })
        .catch(err => {
          clearTimeout(delayTicker);
          logger.error("Pong Failed %sms", (Date.now() - startTime), err);
          this.timesFailedConnections += 1;
        });
    }, 12e3); // 12s => 5times a round, 10s => 3times a round
  }
}

module.exports = BlockHandler;

