const Logger       = require('bearcatjs-logger');
const EventEmitter = require('events').EventEmitter;

const logger       = Logger.getLogger('cache-handler');

// blocks generated in about 24 hours
const CHECK_BLOCKS = 6e3;

class CacheHandler extends EventEmitter {
  constructor (redis, blockModel, logItemModel, txHashModel) {
    super();

    this.Block   = blockModel;
    this.LogItem = logItemModel;
    this.TxHash  = txHashModel;

    this.redis   = redis;
  }

  init () {
    return this;
  }

  // 获取当前最大 BlockNumber
  async readCurrnetBlockNumber() {
    const limit = 1;
    return new Promise((resolve, reject) => {
      this.Block.find().sort({blockNumber: -1}).limit(limit).exec((err, blocks) => {
        if (err || !Array.isArray(blocks) || blocks.length != limit) reject(err);
        else resolve(blocks[0].blockNumber);
      });
    });
  }

  // 获取当前丢失的 Block 列表
  async readMissingBlocks(blockNumber) {
    return new Promise((resolve, reject) => {
      this.Block.find({},{blockNumber: 1}).sort({blockNumber: -1}).limit(CHECK_BLOCKS).exec((err, blocks) => {
        if (err || !Array.isArray(blocks) || blocks.length <= 0) return reject(err);

        let maxBlockNumber = blockNumber || blocks[0].blockNumber;
        let minBlockNumber = blocks[0].blockNumber;
        const existBlockNumbers = blocks.map(block => {
          if (block.blockNumber > maxBlockNumber) maxBlockNumber = block.blockNumber;
          if (block.blockNumber < minBlockNumber) minBlockNumber = block.blockNumber;
          return block.blockNumber;
        });
        logger.debug("MaxBlockNumber #%s MinBlockNumber #%s", maxBlockNumber, minBlockNumber);
      
        const missingBlockNumber = [];
        for (let i = minBlockNumber + 1; i < maxBlockNumber; i++) {
          if (existBlockNumbers.indexOf(i) === -1) missingBlockNumber.push(i);
        }
        logger.debug("Exist Blocks [ %s ] Missing Blocks [ %s ] Total Blocks [ %s ]", blocks.length, missingBlockNumber.length, blocks.length + missingBlockNumber.length);

        resolve(missingBlockNumber);
      });
    });
  }

  // 读取指定 blockNumber 对应的数据
  async readBlock(blockNumber) {
    return new Promise((resolve, reject) => {
      this.Block.findOne({blockNumber}, (err, block) => {
        if (err) reject(err);
        else resolve(block);
      });
    });
  }

  // 写入区块信息
  async writeBlockNumberExist(blockNumber) {
    let writtenRet = await this.redis.setAsync(`s_blk:${blockNumber}`, Date.now(), 'NX');
    logger.debug("BlockNumber Into Redis [ %s ] => ", blockNumber, writtenRet)

    if (writtenRet === 'OK') return true;
    return false;
  }

  // 判断指定区块数据是否存在
  async isBlockExist(blockNumber) {
    let blockExists = await this.redis.existsAsync(`s_blk:${blockNumber}`);

    return boolean(blockExists);
  }

  // 写入指定 blockNumber 对应的数据, 因为做了主键索引, 索引支持多数据源写入
  async writeBlock(blockNumber, blockInfo) {
    return new Promise(async (resolve, reject) => {
      // @WARN 在高并发情况下, 此方法是无法拦截操作的.
      // const writtenBlockInfo = await this.readBlock(blockNumber);
      // if (writtenBlockInfo) {
      //   logger.debug("BlockNumber [ %s ] DB [ %j ] New [ %j ]", blockNumber, writtenBlockInfo, blockInfo);
      //   return resolve(writtenBlockInfo);
      // }
      
      const blockExists = await this.writeBlockNumberExist(blockNumber);
      if (blockExists) {
        logger.debug("BlockNumber Exists In Redis [ %s ] [ %j ]", blockNumber, blockInfo);
        return resolve(null);
      }

      const status    = "created";
      const blockItem = new this.Block({blockNumber, status, blockInfo});
      blockItem.save((err, savedBlock) => {
        if (err) reject(err);
        else resolve(savedBlock);
      });
    });
  }

  // 更新区块状态
  async updateBlockStatus(blockNumber, status) {
    return new Promise((resolve, reject) => {
      this.Block.update({blockNumber}, {$set: {status}}, (err, updatedBlock) => {
        if (err) reject(err);
        else resolve(updatedBlock);
      });
    });
  }

  async readTxRecord(txHash) {
    return new Promise((resolve, reject) => {
      this.TxHash.findOne({txHash}, (err, txRecord) => {
        if (err) reject(err);
        else resolve(txRecord);
      });
    });
  }

  async writeTxRecord(txInfo) {
    return new Promise((resolve, reject) => {
      const txItem = new this.TxHash(Object.assign({}, txInfo, {status: 'created'}));
      txItem.save((err, savedTxItem) => {
        if (err) reject(err);
        else resolve(savedTxItem);
      });
    });
  }

  async updateTxRecordStatus(txHash, status) {
    return new Promise((resolve, reject) => {
      this.TxHash.update({txHash}, {$set: {status}}, (err, updatedTxHash) => {
        if (err) reject(err);
        else resolve(updatedTxHash)
      });
    });
  }

  async readLogs(blockNumber) {
    return new Promise((resolve, reject) => {
      this.LogItem.find({blockNumber}, (err, logItems) => {
        if (err) reject(err);
        else resolve(logItems);
      });
    });
  }

  async writeLogs(blockNumber, contractName, logsInfo) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(logsInfo[contractName]) || logsInfo[contractName].length !== 1) {
         logger.error("Receive Batch Logs [ %s ] [ %s ] [ %j ]", blockNumber, contractName, logsInfo);
      }
      const matchedLog = logsInfo[contractName][0].origin;
      logger.info('Find Matched Log [ %j ]', matchedLog);

      const matcher = {};
      ["address", "data", "blockNumber", "transactionHash"].forEach(key => {
          matcher[`origin.${key}`] = matchedLog[key];
      });

      const query = {};
      query[`logsInfo.${contractName}`] = {"$elemMatch": matcher};
      logger.warn('Find Matched Log Query [ %j ]', query);

      this.LogItem.findOne(query, (err, savedItem) => {
        logger.info('Find Matched Log From Mongo [ %j ] Err: ', savedItem, err);

        if (err) return reject(err);

        if (savedItem) return resolve(savedItem);

        const newLogItem = new this.LogItem({blockNumber, contractName, logsInfo});
        newLogItem.save((err, newSavedItem) => {
          if (err) reject(err);
          else resolve(newSavedItem);
        });
      });
    });
  }

  async revertLogs(blockNumber, contractName, logsInfo) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(logsInfo[contractName]) || logsInfo[contractName].length !== 1) {
         logger.error("Receive Batch Logs [ %s ] [ %s ] [ %j ]", blockNumber, contractName, logsInfo);
      }

      //{"address":"0x081e9864de79CC6451B5086d5131a522CFAe353B","topics":["0x4c04faa490e5760276d4c93311b52cbdcee13446ac39b892ffe3c7c129e214e3"],"data":"0x4659447235556b4a4864736b545679000000000000000000000000000000000000000000000000000000000000000000000000000000000190ca5efcb9480000","blockNumber":2589009,"transactionHash":"0xf79031d69c54d37e7d3bc47176161c3732a7be2d961d2f310889e8c79853d1ec","transactionIndex":7,"blockHash":"0x2fe1a0bc356bccdcccf9aa61e4d04403d869cbdd14dbc09994373aae77f9e60c","logIndex":9,"removed":true,"id":"log_e80adc5f"};
      const removedLog = logsInfo[contractName][0].origin;
      logger.info('Find Removed Log [ %j ]', removedLog);

      const matcher = {};
      ["address", "data", "blockNumber", "transactionHash", "transactionIndex", "blockHash", "logIndex", "id"].forEach(key => {
          matcher[`origin.${key}`] = removedLog[key];
      });

      const query = {};
      query[`logsInfo.${contractName}`] = {"$elemMatch": matcher};
      logger.warn('Find Removed Log Query [ %j ]', query);

      this.LogItem.findOneAndRemove(query, (err, logItem) => {
        logger.info('Find Removed Log From Mongo [ %j ] Err: ', logItem, err);

        if (err) reject(err);
        else resolve(logItem);
      });
    });
  }
}

module.exports = CacheHandler;
