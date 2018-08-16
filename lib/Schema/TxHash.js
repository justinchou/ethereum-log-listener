const Mongoose     = require('mongoose');

const TxHashSchema = new Mongoose.Schema({
  // unique index
  "uber-trace-id": {type: String, index: true, unique: true},
  // unique index
  txHash: {type: String, index: true, unique: true},

  status: String,
  method: String,
  args: Object,
  raw: Object,
  returnRaw: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = TxHashSchema;

