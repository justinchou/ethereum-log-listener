const Logger       = require('bearcatjs-logger');
const logger     = Logger.getLogger();

function mockLogItem(num) {
  const blockNumber = num ? num : Math.round(Math.random() * 695852) + 2e6;
  logger.debug('BlockNumber #%s', blockNumber);

  return {
    'blockNumber' : blockNumber,
    'contractName' : 'UserWalletStorage',
    'logsInfo' : {
      "0": "0x4f566d317a7336616b6741696f6c390000000000000000000000000000000000",
      "1": 169314718055994520000,
      "from": "0x4f566d317a7336616b6741696f6c390000000000000000000000000000000000",
      "value": 169314718055994520000,
      "_eventName": "LOGSubBalanceAction",
    },
    'origin' : {
      "address": "0xe87Bd8C72E47dd488b891F5808e12595C" + blockNumber,
      "blockHash": "0x1f546441ad2f23f42dffa69b75892e63a15cd6cceee2884df06c5da56" + blockNumber,
      "blockNumber": blockNumber,
      "data": "0x4f566d317a7336616b6741696f6c3900000000000000000000000000000000000000000000000000000000000000000000000000000000092db6b7010" + blockNumber,
      "logIndex": 20,
      "removed": false,
      "topics": [
          "0xdd22f8e96eb88715e2a53e63f3783865c07f4c409ede2593c5e15dd813feb7fc"
      ],
      "transactionHash": "0x1c8be27646ecf88319349cb83174c24e25fe79edac4ea419452b1ebf3" + blockNumber,
      "transactionIndex": 17,
      "id": "log_6dfaf473"
    } 
  }
}

module.exports = {mockLogItem};
