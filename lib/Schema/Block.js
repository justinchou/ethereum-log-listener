const Mongoose = require('mongoose');

const TransactionSchema = Mongoose.Schema({
  blockHash: String,
  blockNumber: Number,
  from: String,
  gas: Number,
  gasPrice: Number,
  hash: String,
  input: String,
  nonce: Number,
  to: String,
  transactionIndex: Number,
  value: Number,
  v: String,
  r: String,
  s: String
});

// Ethjs 20, eth.getBlock(number, true) 20, newBlockHeaders 14
const BlockInfoSchema = Mongoose.Schema({
  difficulty: Number,                 // Ethjs √, eth.getBlock √, newBlockHeaders ×
  extraData: String,
  gasLimit: Number,
  gasUsed: Number,
  hash: String,
  logsBloom: String,
  miner: String,
  mixHash: String,                    // Ethjs √, eth.getBlock √, newBlockHeaders ×
  nonce: String,
  number: Number,
  parentHash: String,
  receiptsRoot: String,
  sha3Uncles: String,
  size: Number,                       // Ethjs √, eth.getBlock √, newBlockHeaders ×
  stateRoot: String,
  timestamp: Number,
  totalDifficulty: Number,            // Ethjs √, eth.getBlock √, newBlockHeaders ×
  transactions: [TransactionSchema],  // Ethjs √, eth.getBlock √, newBlockHeaders ×
  transactionsRoot: String,
  uncles: Array,                      // Ethjs √, eth.getBlock √, newBlockHeaders ×
});

const BlockSchema = Mongoose.Schema({
  // unique index
  blockNumber: {type: Number, index: true, unique: true},

  status: String,
  logAmount: {type: Number, default: 0},
  blockInfo: BlockInfoSchema
});

module.exports = BlockSchema;
