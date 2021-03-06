const Path         = require("path");
const Logger       = require('bearcatjs-logger');
const CacheHandler = require("../lib/CacheHandler");
const BlockHandler = require("../lib/BlockHandler");
const LogHandler   = require("../lib/LogHandler");
const Utils        = require("../lib/Utils");

const logger       = Logger.getLogger();

const {contracts, topic2name, topic2event} = Utils.loadAllABIFromBuild(Path.join(__dirname, '../../sphinx-watch-dog/node_modules/sphinx-meta/bestspx/build/contracts'));
const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();
const blockHandler = new BlockHandler({}, web3).init();
const logHandler = new LogHandler({}, web3, contracts, topic2name, topic2event).init();

// quit(30e3);

blockHandler.on('blockNumber', (blockNumber) => {
  logger.debug('Recv BlockNumber #%s', blockNumber);
});
blockHandler.on('blockHeader', (blockNumber, blockHeader) => {
  logger.debug('Recv BlockHeader #%s [ %j ]', blockNumber, blockHeader);
});
blockHandler.on('blockInfo', async (blockNumber, parsedBlock) => {
  logger.debug('Recv BlockInfo #%s [ %j ]', blockNumber, parsedBlock);

  let amount = await logHandler.pullLogInfo(blockNumber);
  logger.info('Recv #%s Filtered Logs [ %s ]', blockNumber, amount);

  parsedBlock.logAmount = amount;
  await cacheHandler.writeBlock(blockNumber, parsedBlock);
});

logHandler.on('log', async (blockNumber, contractName, parsedLog, origin) => {
  logger.debug('Recv Log #%s [ %s ] [ %j ] [ %j ]', blockNumber, contractName, parsedLog, origin);
  await cacheHandler.writeLogs(blockNumber, contractName, parsedLog, origin)
});
logHandler.on('revert', (blockNumber, contractName, parsedLog, origin) => {
  logger.debug('Revert Log #%s [ %s ] [ %j ] [ %j ]', blockNumber, contractName, parsedLog, origin);
});

async function getMissingBlocks() {
  const missingBlocks = await cacheHandler.readMissingBlocks();
  const currentBlock  = await cacheHandler.readCurrnetBlockNumber();
    logger.debug("Current Block [ %s ] Missing Blocks Amount [ %s ]", currentBlock, missingBlocks.length);
  
  for (let i = 0; i < missingBlocks.length; i++) {
    const blockInfo = await blockHandler.getBlockInfo(missingBlocks[i]);
    logger.debug('Get Back Missing Block #%s [ %j ]', missingBlocks[i], blockInfo);
    await cacheHandler.writeBlock(blockInfo.number, blockInfo);
  }
}
getMissingBlocks();

// blockHandler.pullBlockNumber(true);
blockHandler.subscribeBlock(true);

