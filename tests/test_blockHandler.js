const Logger       = require('bearcatjs-logger');
const BlockHandler = require("../lib/BlockHandler");

const logger       = Logger.getLogger();

const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("./mocks/ConnectionHandlerMocker").connectionHandler;

quit(30e3);

let blockHandler = new BlockHandler({}, web3);
blockHandler.on('blockNumber', (blockNumber) => {
  logger.debug('Recv BlockNumber #%s', blockNumber);
});
blockHandler.on('blockHeader', (blockNumber, blockHeader) => {
  logger.debug('Recv BlockHeader #%s [ %j ]', blockNumber, blockHeader);
});
blockHandler.on('blockInfo', (blockNumber, parsedBlock) => {
  logger.debug('Recv BlockInfo #%s [ %j ]', blockNumber, parsedBlock);
});

// blockHandler.pullBlockNumber(true);
blockHandler.subscribeBlock(true);
