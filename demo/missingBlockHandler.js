const Logger       = require('bearcatjs-logger');
const CacheHandler = require("../lib/CacheHandler");
const BlockHandler = require("../lib/BlockHandler");

const logger       = Logger.getLogger();

const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();
const blockHandler = new BlockHandler({}, web3);

blockHandler.on('blockNumber', (blockNumber) => {
  logger.debug('Recv BlockNumber #%s', blockNumber);
});
blockHandler.on('blockHeader', (blockNumber, blockHeader) => {
  logger.debug('Recv BlockHeader #%s [ %j ]', blockNumber, blockHeader);
});
blockHandler.on('blockInfo', (blockNumber, parsedBlock) => {
  logger.debug('Recv BlockInfo #%s [ %j ]', blockNumber, parsedBlock);
  
});

quit(30e3);

async function getMissingBlocks() {
  let missingBlocks = await cacheHandler.readMissingBlocks();
  let currentBlock  = await cacheHandler.readCurrnetBlockNumber();
    logger.debug("Current Block [ %s ] Missing Blocks Amount [ %s ]", currentBlock, missingBlocks.length);
  
  for (let i = 0; i < missingBlocks.length; i++) {
    let blockInfo = await blockHandler.getBlockInfo(missingBlocks[i]);
    logger.debug('Get Back Missing Block #%s [ %j ]', missingBlocks[i], blockInfo);
    await cacheHandler.writeBlock(blockInfo.number, blockInfo);
  }
}
getMissingBlocks();

// blockHandler.pullBlockNumber(true);
blockHandler.subscribeBlock(true);
