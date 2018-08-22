const Mongoose     = require('mongoose');

const LogOrigionSchema = Mongoose.Schema({
  address: {type: String, index: true},
  topics: Array,
  data: String,
  blockNumber: Number,
  transactionHash: {type: String, index: true},
  transactionIndex: Number,
  blockHash: String,
  logIndex: Number,
  removed: Boolean,
  id: String
});

const LogItemSchema = Mongoose.Schema({
  // unique index
  uniqueKey: {type: String, index: true, unique: true},

  blockNumber: Number,
  contractName: String,
  status: String,
  logsInfo: Object,
  origin: LogOrigionSchema
});

module.exports = LogItemSchema;

