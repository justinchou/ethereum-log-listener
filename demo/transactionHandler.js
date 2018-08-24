const Logger       = require('bearcatjs-logger');
const TransactionHandler = require("../lib/TransactionHandler");

const logger       = Logger.getLogger();

const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const transactionHandler = new TransactionHandler({}, web3);

quit(5e3);

const validTxHash = '0x9d21f32a7e95639c19131c84c2b3992e2040fd256a70c94f007b63cfdcd83599';
transactionHandler.getTxStatus(validTxHash)
.then(receipt => {
  logger.debug("Valid TxReceipt %s => [ %j ]", validTxHash, receipt);
})
.catch(err => {
  logger.error('Valid TxReceipt %s Error: ', validTxHash, err.message);
});

const invalidTxHash = '0x9d21f32a7e95639c19131c84c2b3992e2040fd256a70c94f007b63cfdcd83590';
transactionHandler.getTxStatus(invalidTxHash)
.then(receipt => {
  logger.debug("Invalid TxReceipt %s => [ %j ]", invalidTxHash, receipt);
})
.catch(err => {
  logger.error('Invalid TxReceipt %s Error: ', invalidTxHash, err.message);
});

const failedTxHash = '0x7ddab89c953fcf5cd0aac9998cc0021abd4b9b181c0f65e52ff14d4a7b7b8474';
transactionHandler.getTxStatus(failedTxHash)
.then(receipt => {
  logger.debug("Failed TxReceipt %s => [ %j ]", failedTxHash, receipt);
})
.catch(err => {
  logger.error('Failed TxReceipt %s Error: ', failedTxHash, err.message);
});

