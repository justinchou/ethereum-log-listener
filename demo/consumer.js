const Path         = require("path");
const Logger       = require('bearcatjs-logger');
const CacheHandler = require("../lib/CacheHandler");
const Utils        = require("../lib/Utils");

const logger       = Logger.getLogger();

const {contracts, address2name, topic2name, topic2event} = Utils.loadAllABIFromBuild(Path.join(__dirname, '../../sphinx-watch-dog/node_modules/sphinx-meta/bestspx/build/contracts'));
const {redis, Block, LogItem, TxHash, Contract, quit} = require("../mocks/ConnectionHandlerMocker").connectionHandler;
const cacheHandler = new CacheHandler(redis, Block, LogItem, TxHash, Contract).init();

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

      if (logRecords.length <= 0) {
        // block has no log belongs to us
        // logger.debug('Block Finished #%s No Logs', blockNumber);
      } else {
        // loop logs and send to message queue
        await logRecords.forEach(async logRecord => {
          // TODO send to nsq or consume one by one...
          const {contractName, origin} = logRecord;
          await cacheHandler.updateLogStatus(contractName, origin, 'finished');
        });
      }

      return await cacheHandler.updateBlockStatus(blockNumber, 'finished');
    });
  }

  setTimeout(() => getUnfinishedBlocks().catch(getUnfinishedBlocksError), 10e3);
}
getUnfinishedBlocks().catch(getUnfinishedBlocksError);
