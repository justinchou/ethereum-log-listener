const Logger       = require('bearcatjs-logger');
const CacheHandler = require("../lib/CacheHandler");

const logger       = Logger.getLogger();

const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();

const {BlockNumbersMocker, BlockMocker, TxInfoMocker, LogItemMocker, ContractMocker} = require('../mocks/index');

quit();

function findMissionNumber() {
  const blocks = BlockNumbersMocker.mockFindBlockNumbers();
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
findMissionNumber();


async function rwBlock() {
  const block = BlockMocker.mockBlock();

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
rwBlock();


async function rwTxHash() {
  const txInfo = TxInfoMocker.mockTxInfo();

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
rwTxHash();


async function rwLogItems() {
  const logItem = LogItemMocker.mockLogItem();

  const {blockNumber, contractName, logsInfo, origin} = logItem;
  let savedLogItem = await cacheHandler.writeLogs(blockNumber, contractName, logsInfo, origin);
    logger.debug('Save LogItem [ %j ]', savedLogItem);

  try {
    let updated = await cacheHandler.writeLogs(blockNumber+1, contractName, logsInfo, origin);
    logger.info('Update LogItem #%s => #%s [ %s ]', blockNumber, blockNumber+1, updated);
  } catch (err) {
    logger.error('Error: %s', err.message);
  }

  let writtenLogItemOld = await cacheHandler.readLogs(logItem.blockNumber);
    logger.debug('Written LogItem Old [ %j ]', writtenLogItemOld);
  let writtenLogItemNew = await cacheHandler.readLogs(logItem.blockNumber + 1);
    logger.debug('Written LogItem New [ %j ]', writtenLogItemNew);
}
rwLogItems();

async function rwContract() {
  const address = ContractMocker.mockContractAddress();

  let savedContract = await cacheHandler.writeContractAddress(address, 'origin');
    logger.debug('Save Contract [ %j ]', savedContract);

  try {
    await cacheHandler.writeContractAddress(address, 'origin');
  } catch (err) {
    logger.error('Error: %s', err.message);
  }

  let isValidAddress;
  isValidAddress = await cacheHandler.isValidAddress(address);
    logger.debug('Address [ %s ] Should Valid [ %s ]', address, isValidAddress);

  const inValidAddress = ContractMocker.mockContractAddress();
  isValidAddress = await cacheHandler.isValidAddress(inValidAddress);
    logger.debug('Address [ %s ] Should InValid [ %s ]', inValidAddress, isValidAddress);

}
rwContract();
