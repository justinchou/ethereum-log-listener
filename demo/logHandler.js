const Path         = require("path");
const Logger       = require('bearcatjs-logger');
const BlockHandler = require("../lib/BlockHandler");
const LogHandler   = require("../lib/LogHandler");
const Utils        = require("../lib/Utils");

const logger       = Logger.getLogger();

const {contracts, address2name, topic2name, topic2event} = Utils.loadAllABIFromBuild(Path.join(__dirname, '../../sphinx-watch-dog/node_modules/sphinx-meta/bestspx/build/contracts'));

const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const blockHandler = new BlockHandler({}, web3);
const logHandler = new LogHandler({}, web3, contracts, address2name, topic2name, topic2event); 

quit(300e3);

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
});

logHandler.on('log', (blockNumber, contractName, parsedLog) => {
  logger.debug('Recv Log #%s [ %s ] [ %j ]', blockNumber, contractName, parsedLog);
});
logHandler.on('revert', (blockNumber, contractName, parsedLog) => {
  logger.debug('Revert Log #%s [ %s ] [ %j ]', blockNumber, contractName, parsedLog);
});


// blockHandler.pullBlockNumber(true);
blockHandler.subscribeBlock(true);
