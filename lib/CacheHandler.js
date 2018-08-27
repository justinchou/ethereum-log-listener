const Logger       = require('bearcatjs-logger');
const EventEmitter = require('events').EventEmitter;

const logger       = Logger.getLogger('cache-handler');

require('./Utils');

// blocks generated in about 24 hours
const CHECK_BLOCKS = 6e3;

class CacheHandler extends EventEmitter {
  constructor (redis, blockModel, logItemModel, txHashModel, contractModel) {
    super();

    this._Block    = blockModel;
    this._LogItem  = logItemModel;
    this._TxHash   = txHashModel;
    this._Contract = contractModel;

    this._redis    = redis;
  }

  init () {
    return this;
  }



  // 获取当前最大 BlockNumber
  readCurrnetBlockNumber() {
    const limit = 1;
    return new Promise((resolve, reject) => {
      this._Block.find().sort({blockNumber: -1}).limit(limit).exec((err, blocks) => {
        if (err || !Array.isArray(blocks)) reject(err);
        else if (blocks.length === 0) resolve(0);
        else resolve(blocks[0].blockNumber);
      });
    });
  }

  // 获取当前丢失的 Block 列表
  readMissingBlocks() {
    return new Promise((resolve, reject) => {
      this._Block.find({}, {blockNumber: 1}).sort({blockNumber: -1}).limit(CHECK_BLOCKS).exec((err, blocks) => {
        if (err || !Array.isArray(blocks) || blocks.length < 0) return reject(err);

        // 如果数据库为空, 则认为初次执行, 忽略前方的区块
        if (blocks.length === 0) return resolve([]);

        let maxBlockNumber = blocks[0].blockNumber;
        let minBlockNumber = blocks[blocks.length - 1].blockNumber;
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
        logger.debug("Exist Blocks [ %s ] Missing Blocks [ %s ] Total Blocks [ %s ]", blocks.length, missingBlockNumber.length, maxBlockNumber - minBlockNumber);

        resolve(missingBlockNumber);
      });
    });
  }

  // 获取当前未处理的 Block 列表
  readUnfinishedBlocks() {
    return new Promise((resolve, reject) => {
      this._Block.find({status: 'created'}, {blockNumber: 1}).sort({blockNumber: -1}).limit(CHECK_BLOCKS).exec((err, blocks) => {
        if (err || !Array.isArray(blocks) || blocks.length < 0) return reject(err);

        // 如果数据库为空, 则认为初次执行, 忽略前方的区块
        if (blocks.length === 0) return resolve([]);

        let maxBlockNumber = blocks[0].blockNumber;
        let minBlockNumber = blocks[blocks.length - 1].blockNumber;

        const existBlockNumbers = blocks.map(block => {
          if (block.blockNumber > maxBlockNumber) maxBlockNumber = block.blockNumber;
          if (block.blockNumber < minBlockNumber) minBlockNumber = block.blockNumber;
          return block.blockNumber;
        });
        logger.debug("MaxBlockNumber #%s MinBlockNumber #%s", maxBlockNumber, minBlockNumber);

        const unfinishedBlockNumber = [];
        for (let i = minBlockNumber; i < maxBlockNumber; i++) {
          if (existBlockNumbers.indexOf(i) >= 0) unfinishedBlockNumber.push(i);
          else if (existBlockNumbers.indexOf(i) === -1) break;
        }
        logger.debug("Unfinished Blocks [ %s ] Missing Blocks [ %s ] Total Blocks [ %s ]", unfinishedBlockNumber.length, maxBlockNumber - minBlockNumber - unfinishedBlockNumber.length, maxBlockNumber - minBlockNumber);

        resolve(unfinishedBlockNumber);
      });
    });
  }

  // 写入区块信息
  async _writeBlockNumber(blockNumber) {
    let writtenRet = await this._redis.setAsync(`s_blk:${blockNumber}`, Date.now(), 'NX');
    logger.debug("BlockNumber Into Redis [ %s ] => ", blockNumber, writtenRet)

    if (writtenRet === 'OK') return true;
    return false;
  }

  // 判断指定区块数据是否存在
  async _isBlockExist(blockNumber) {
    let blockExists = await this._redis.existsAsync(`s_blk:${blockNumber}`);

    return boolean(blockExists);
  }

  // 读取指定 blockNumber 对应的数据
  readBlock(blockNumber) {
    return new Promise((resolve, reject) => {
      this._Block.findOne({blockNumber}, (err, block) => {
        if (err) reject(err);
        else resolve(block);
      });
    });
  }

  // 写入指定 blockNumber 对应的数据, 因为做了主键索引, 索引支持多数据源写入
  writeBlock(blockNumber, blockInfo) {
    return new Promise(async (resolve, reject) => {
      // @WARN 在高并发情况下, 此方法是无法拦截操作的.
      // const writtenBlockInfo = await this.readBlock(blockNumber);
      // if (writtenBlockInfo) {
      //   logger.debug("BlockNumber [ %s ] DB [ %j ] New [ %j ]", blockNumber, writtenBlockInfo, blockInfo);
      //   return resolve(writtenBlockInfo);
      // }
      
      const writeSuccess = await this._writeBlockNumber(blockNumber);
      if (!writeSuccess) {
        logger.debug("BlockNumber Exists In Redis [ %s ] [ %j ]", blockNumber, blockInfo);
        return resolve(null);
      }

      const status    = "created";
      const blockItem = new this._Block({blockNumber, status, blockInfo});
      blockItem.save((err, savedBlock) => {
        logger.debug('Save Block #%s [ %j ]', blockNumber, savedBlock, err);
        if (err) reject(err);
        else resolve(savedBlock);
      });
    });
  }

  // 更新区块状态
  updateBlockStatus(blockNumber, status) {
    return new Promise((resolve, reject) => {
      this._Block.update({blockNumber}, {$set: {status}}, (err, updatedBlock) => {
        logger.debug('Update Block Status [ %j ] [ %j ]', {blockNumber}, updatedBlock);
        if (err) reject(err);
        else resolve(updatedBlock.n === 1 && updatedBlock.nModified === 1 && updatedBlock.ok === 1);
      });
    });
  }




  // 写入日志信息
  async _writeLogInfo(key, value) {
    let writtenRet = await this._redis.setAsync(`s_log:${key}`, value, 'NX');
    logger.debug("Log Into Redis [ %s ] => ", key, value);

    if (writtenRet === 'OK') return true;
    return false;
  }

  // 判断指定日志数据是否存在
  async _isLogInfoExist(key) {
    let logExists = await this._redis.existsAsync(`s_log:${key}`);

    return boolean(logExists);
  }

  // 读取区块下所有日志
  readLogs(blockNumber) {
    return new Promise((resolve, reject) => {
      this._LogItem.find({blockNumber, status: "created", "origin.removed": false}, (err, logItems) => {
        if (err) reject(err);
        else resolve(logItems);
      });
    });
  }

  // 写入日志
  writeLogs(blockNumber, contractName, logsInfo, origin) {
    // origin日志格式 {"address":"0x081e9864de79CC6451B5086d5131a522CFAe353B","topics":["0x4c04faa490e5760276d4c93311b52cbdcee13446ac39b892ffe3c7c129e214e3"],"data":"0x4659447235556b4a4864736b545679000000000000000000000000000000000000000000000000000000000000000000000000000000000190ca5efcb9480000","blockNumber":2589009,"transactionHash":"0xf79031d69c54d37e7d3bc47176161c3732a7be2d961d2f310889e8c79853d1ec","transactionIndex":7,"blockHash":"0x2fe1a0bc356bccdcccf9aa61e4d04403d869cbdd14dbc09994373aae77f9e60c","logIndex":9,"removed":true,"id":"log_e80adc5f"};
    return new Promise(async (resolve, reject) => {
      origin.address = origin.address.toChecksumAddress();
      let uniqueKey = String(`${contractName}-${origin.transactionHash}-${origin.address.toChecksumAddress()}-${origin.data}`).sha3();

      let isNewLog = await this._writeLogInfo(uniqueKey, Date.now());
      if (!isNewLog) {
        logger.debug("Log Exists In Redis #%s [ %s ] [ %j ] [ %j ]", blockNumber, contractName, logsInfo, origin);
        this._LogItem.update({uniqueKey}, {$set: {blockNumber, status: 'updated', origin}}, (err, updatedLog) => {
          if (err) reject(err);
          else resolve(updatedLog.n === 1 && updatedLog.nModified === 1 && updatedLog.ok === 1);
        });
      } else {
        const newLogItem = new this._LogItem({uniqueKey, blockNumber, contractName, status: 'created', logsInfo, origin});
        newLogItem.save((err, newSavedItem) => {
          if (err) reject(err);
          else resolve(newSavedItem);
        });
      }
    });
  }

  updateLogStatus(contractName, origin, status) {
    return new Promise((resolve, reject) => {
      origin.address = origin.address.toChecksumAddress();
      let uniqueKey = String(`${contractName}-${origin.transactionHash}-${origin.address.toChecksumAddress()}-${origin.data}`).sha3();

      this._LogItem.update({uniqueKey}, {$set: {status}}, (err, updatedLog) => {
        logger.debug('Update LogItem Status [ %j ] [ %j ]', {uniqueKey}, updatedLog);
        if (err) reject(err);
        else resolve(updatedLog.n === 1 && updatedLog.nModified === 1 && updatedLog.ok === 1);
      });
    });
  }



  // 读取交易的 TxHash 值
  readTxRecord(txHash) {
    return new Promise((resolve, reject) => {
      this._TxHash.findOne({txHash}, (err, txRecord) => {
        if (err) reject(err);
        else resolve(txRecord);
      });
    });
  }

  // 记录交易的 TxHash 值
  writeTxRecord(txInfo) {
    return new Promise((resolve, reject) => {
      const txItem = new this._TxHash(Object.assign({}, txInfo, {status: 'created'}));
      txItem.save((err, savedTxItem) => {
        if (err) reject(err);
        else resolve(savedTxItem);
      });
    });
  }

  // 更新记录 TxHash 值的标记状态
  updateTxRecordStatus(txHash, status) {
    return new Promise((resolve, reject) => {
      this._TxHash.update({txHash}, {$set: {status}}, (err, updatedTxHash) => {
        logger.debug('Update TxRecord Status [ %j ] [ %j ]', {txHash}, updatedTxHash);
        if (err) reject(err);
        else resolve(updatedTxHash.n === 1 && updatedTxHash.nModified === 1 && updatedTxHash.ok === 1);
      });
    });
  }



  // 写入 address 数据 - 一般情况是每发布一个合约就有一个地址, 但是也存在一些动态创建的合约, 需要后续写入其中
  writeContractAddress(address, type) {
    address = address.toChecksumAddress();
    return new Promise((resolve, reject) => {
      const contractAddress = new this._Contract({address, type});
      contractAddress.save((err, savedAddress) => {
        if (err) {
          logger.warn('Save Contract Address Already Exists [ %s ] Type [ %s ]', address, type);
          reject(err);
        }
        else resolve(savedAddress);
      });
    });
  }

  // 判断 address 是否属于当前项目当前环境
  isValidAddress(address) {
    address = address.toChecksumAddress();
    return new Promise((resolve, reject) => {
      this._Contract.findOne({address}, (err, writtenAddress) => {
        if (err) {
          resolve(false);
          logger.error('Check Contract Address Failed! [ %s ]', address);
        }
        else if (!writtenAddress) resolve(false);
        else resolve(true);
      });
    });
  }

}

module.exports = CacheHandler;

