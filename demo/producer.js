const Path         = require("path");
const Logger       = require('bearcatjs-logger');
const CacheHandler = require("../lib/CacheHandler");
const BlockHandler = require("../lib/BlockHandler");
const LogHandler   = require("../lib/LogHandler");
const Utils        = require("../lib/Utils");

const logger       = Logger.getLogger();

const {contracts, address2name, topic2name, topic2event} = Utils.loadAllABIFromBuild(Path.join(__dirname, '../../sphinx-watch-dog/node_modules/sphinx-meta/bestspx/build/contracts'));
const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();
const blockHandler = new BlockHandler({}, web3).init();
const logHandler = new LogHandler({}, web3, contracts, topic2name, topic2event).init();

// special logic to handle event without pre-compiled address - new contract in contracts
function filterSpecialLog(contractName, parsedLog) {
  let eventName = parsedLog._eventName;

  if (contractName === 'AbstractOraclize' && eventName === 'OraclizeQuery') {
    cacheHandler.writeContractAddress(matchedLog.address, 'dymanic');
      then(savedAddressFilter => {
        logger.warn('Save OraclizeQuery Address [ %s ] For OraclizeQueryResult', matchedLog.address);
      })
      .catch(err => {
        logger.error('Save OraclizeQuery Address [ %s ] Failed With Error [ %s ]', err.message, err);
      });
  }
}

// write init contract address
Utils.initOriginContractAddress(cacheHandler, Object.keys(address2name));

// write block
// blockHandler.on('blockNumber', (blockNumber) => {
//   logger.debug('Recv BlockNumber #%s', blockNumber);
// });
// blockHandler.on('blockHeader', (blockNumber, blockHeader) => {
//   logger.debug('Recv BlockHeader #%s [ %j ]', blockNumber, blockHeader);
// });
blockHandler.on('blockInfo', async (blockNumber, parsedBlock) => {
  logger.debug('Recv BlockInfo #%s [ %j ]', blockNumber, parsedBlock);

  let amount = await logHandler.pullLogInfo(blockNumber);
  logger.info('Recv #%s Filtered Logs [ %s ]', blockNumber, amount);

  parsedBlock.logAmount = amount;
  await cacheHandler.writeBlock(blockNumber, parsedBlock);
});

// write log
// logHandler.on('revert', (blockNumber, contractName, parsedLog, origin) => {
//   logger.debug('Revert Log #%s [ %s ] [ %j ] [ %j ]', blockNumber, contractName, parsedLog, origin);
// });
logHandler.on('log', async (blockNumber, contractName, parsedLog, origin) => {
  logger.debug('Recv Log #%s [ %s ] [ %j ]', blockNumber, contractName, parsedLog);

  let txRecord = await cacheHandler.readTxRecord(origin.transactionHash);
  let validAddress = await cacheHandler.isValidAddress(origin.address);
  if ((!txRecord || txRecord.txHash !== origin.transactionHash) && (!validAddress)) {
    logger.info('Wrong TxHash, Maybe From Another Server [ %j ] [ %s ] [ %j ]', origin, contractName, parsedLog);
// @TODO return
//    return;
  }
  filterSpecialLog(contractName, parsedLog);

  await cacheHandler.writeLogs(blockNumber, contractName, parsedLog, origin);
});

// find missing block and log
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

