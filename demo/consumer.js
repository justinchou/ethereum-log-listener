const Path   = require("path");
const Logger = require('bearcatjs-logger');
const logger = Logger.getLogger();

const CacheHandler = require("../lib/CacheHandler");
const TxHandler    = require("../lib/TransactionHandler");
const Utils        = require("../lib/Utils");

const {contracts, address2name, topic2name, topic2event} = Utils.loadAllABIFromBuild(Path.join(__dirname, '../../sphinx-watch-dog/node_modules/sphinx-meta/bestspx/build/contracts'));
const {redis, web3, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();
const txHandler = new TxHandler({}, web3);

async function consumeLog(contractName, logsInfo, origin) {
  const txHash = origin.transactionHash;
  const txStatus = await txHandler.getTxStatus(txHash);

  if (txStatus) {
    // @TODO send to nsq or consume one by one...
  }
}

function getUnfinishedBlocksError(err) {
  logger.error("Handle Unfinished Blocks Failed [ %s ]", err.message);
  process.exit(124);
}

async function getUnfinishedBlocks() {
  const unfinishedBlocks = await cacheHandler.readUnfinishedBlocks();
    logger.debug("Unfinished Blocks Amount [ %s ] [ %j ]", unfinishedBlocks.length, unfinishedBlocks);

  if (unfinishedBlocks.length > 0) {
    await unfinishedBlocks.forEach(async blockNumber => {
      const logRecords = await cacheHandler.readLogs(blockNumber);

      let successCounter = 0;
      if (logRecords.length <= 0) {
        // block has no log belongs to us
        // logger.debug('Block Finished #%s No Logs', blockNumber);
      } else {
        // loop logs and send to message queue
        await logRecords.forEach(async logRecord => {
          const {contractName, logsInfo, origin} = logRecord;
          try {
            await consumeLog(contractName, logsInfo, origin);
            await cacheHandler.updateLogStatus(contractName, origin, 'finished');
            successCounter += 1;
          } catch (err) {
            // @TODO redo failed via consume error type.
            logger.error("Consume Log Failed With [ %s ]", err.message);
          }
        });
      }

      if (successCounter === logRecords.length)
        await cacheHandler.updateBlockStatus(blockNumber, 'finished');
    });
  }

  setTimeout(() => getUnfinishedBlocks().catch(getUnfinishedBlocksError), 10e3);
}
getUnfinishedBlocks().catch(getUnfinishedBlocksError);
