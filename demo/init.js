const CacheHandler = require("../lib/CacheHandler");
const BlockHandler = require("../lib/BlockHandler");

const Logger       = require('bearcatjs-logger');
const logger       = Logger.getLogger();

const {BlockNumbersMocker, BlockMocker, TxInfoMocker, LogItemMocker, ContractMocker} = require('../mocks/index');
const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();
const blockHandler = new BlockHandler({}, web3).init();

quit(10e3);

async function rwBlock() {
  const block = BlockMocker.mockBlock();

  // Rinkeby 网络, 该区块基本是从服务上线开始. @TODO 其他网络请单独计算.
  // const startBlockNumber   = 2200000 - 1; // 2018-04-01 左右
  // const checkBlockBumber   = 2300000 - 1; // 2018-04-20 左右
  const startBlockNumber   = 2880000 - 1;
  const checkBlockBumber   = 2890000 - 1;
  const currentBlockNumber = await blockHandler.getBlockNumber();

  await cacheHandler.removeRedisBlockNumber(startBlockNumber);
  await cacheHandler.removeRedisBlockNumber(checkBlockBumber);
  
  let savedBlock;
  block.blockNumber = startBlockNumber;
  savedBlock = await cacheHandler.writeBlock(block.blockNumber, block.blockInfo);
    logger.debug("Save Block [ %j ]", savedBlock);
  block.blockNumber = checkBlockBumber;
  savedBlock = await cacheHandler.writeBlock(block.blockNumber, block.blockInfo);
    logger.debug("Save Block [ %j ]", savedBlock);

  const missingBlocks = await cacheHandler.readMissingBlocks();
    logger.debug("Current BlockNumber [ %s ] Missing Blocks Amount [ %s ]", currentBlockNumber, missingBlocks.length);
  const unfinishedBlock = await cacheHandler.readUnfinishedBlocks();
    logger.debug("Current BlockNumber [ %s ] Unfinished Blocks Amount [ %s ]", currentBlockNumber, unfinishedBlock.length);
}

rwBlock();
