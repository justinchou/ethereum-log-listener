const EventEmitter = require('events').EventEmitter;
const Logger       = require('bearcatjs-logger');
const BigNumber    = require('bignumber.js');
const BN           = require('web3').utils.BN;

const logger       = Logger.getLogger('block-handler');

class TransactionHandler extends EventEmitter {
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

  getTxStatus(txHash) {
    return new Promise((resolve, reject) => {
      this.checkConnection();

      const startTime = Date.now();
      const delayTicker = setTimeout(() => this.timesFailedConnections += 1, 3e3);
      this.web3.eth.getTransactionReceipt(txHash).then(receipt => {
        clearTimeout(delayTicker);
        logger.debug('Block Info %sms [ %s ] [ %j ]', (Date.now() - startTime), txHash, receipt);
        this.timesFailedConnections = 0;

        if (!receipt) return resolve(false);

        resolve(receipt.status);
      }).catch(err => {
        clearTimeout(delayTicker);
        logger.error('Get Block Info %sms [ %s ] Error: ', (Date.now() - startTime), txHash, err);
        this.timesFailedConnections += 1;

        reject(err);
      });
    });
  }

}

module.exports = TransactionHandler;
