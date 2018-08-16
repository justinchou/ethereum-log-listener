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
LogOrigionSchema.index({transactionHash: 1, address: 1, data: 1});

const LogItemSchema = Mongoose.Schema({
  blockNumber: Number,
  contractName: String,

  status: String,
  logsInfo: Object,
  origin: LogOrigionSchema
});

module.exports = LogItemSchema;

