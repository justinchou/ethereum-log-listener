const Async        = require('async');
const Logger       = require('bearcatjs-logger');
const ConnectionHandler = require('../lib/ConnectionHandler');
const CacheHandler = require("../lib/CacheHandler");

const mongooseConf = "mongodb://127.0.0.1:27017/watch-dog";
const redisConf    = {host: '127.0.0.1', port: 6379};
const logConfig    = {
  appenders  : {"console": { "type"     : "console"}},
  categories : {"default": { "appenders": ["console"], "level": "DEBUG" }}
};
Logger.configure(logConfig);

const logger       = Logger.getLogger();

const connectionHandler = new ConnectionHandler({mongoose: mongooseConf, redis: redisConf}).init();
const {redis, Block, LogItem, TxHash} = connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash).init();

const {mockFindBlockNumbers, mockBlock, mockTxInfo} = require('./mocks/index');

function findMissionNumber() {
  const blocks = mockFindBlockNumbers();
  console.log("Mock Blocks [ %s ]", blocks.length);

  let maxBlockNumber = blocks[0].blockNumber;
  let minBlockNumber = blocks[0].blockNumber;
  const existBlockNumbers = blocks.map(block => {
    if (block.blockNumber > maxBlockNumber) maxBlockNumber = block.blockNumber;
    if (block.blockNumber < minBlockNumber) minBlockNumber = block.blockNumber;
    return block.blockNumber;
  });
  console.log("MaxBlockNumber #%s MinBlockNumber #%s", maxBlockNumber, minBlockNumber);

  const missingBlockNumber = [];
  for (let i = minBlockNumber + 1; i < maxBlockNumber; i++) {
    if (existBlockNumbers.indexOf(i) === -1) missingBlockNumber.push(i);
  }

  console.log("Exist Blocks [ %s ] Missing Blocks [ %s ] Total Blocks [ %s ]", blocks.length, missingBlockNumber.length, blocks.length + missingBlockNumber.length);
}
// findMissionNumber();


async function rwBlock() {
  const block = mockBlock();

  let savedBlock = await cacheHandler.writeBlock(block.blockNumber, block.blockInfo);
    logger.debug("Save Block [ %j ]", savedBlock);

  try {
    await cacheHandler.writeBlock(block.blockNumber, block.blockInfo);
  } catch(err) {
    logger.error("Error: %s", err.message);
  };

  let updatedBlock = await cacheHandler.updateBlockStatus(block.blockNumber, "finished");
    logger.debug("Updated Block [ %j ]", updatedBlock);
  
  let writtenBlock = await cacheHandler.readBlock(block.blockNumber);
    logger.debug("Written Block [ %j ]", writtenBlock);

  let missingBlocks = await cacheHandler.readMissingBlocks();
  let currentBlock  = await cacheHandler.readCurrnetBlockNumber();
    logger.debug("Current Block [ %s ] Missing Blocks [ %s ]", currentBlock, missingBlocks.length);
}
// rwBlock();


async function rwTxHash() {
  const txInfo = mockTxInfo();

  let savedTxRecord = await cacheHandler.writeTxRecord(txInfo);
    logger.debug('Save TxHash [ %j ]', savedTxRecord);

  try {
    await cacheHandler.writeTxRecord(txInfo)
  } catch(err) {
    logger.error('Error: %s', err.message);
  };

  let updatedTxRecord = await cacheHandler.updateTxRecordStatus(txInfo.txHash, 'finished');
    logger.debug('Update TxHash [ %j ]', updatedTxRecord);

  let writtenTxRecord = await cacheHandler.readTxRecord(txInfo.txHash);
    logger.debug('Written TxHash [ %j ]', writtenTxRecord);
}
// rwTxHash();



