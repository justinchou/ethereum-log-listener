const Mongoose     = require('mongoose');

const ContractSchema = new Mongoose.Schema({
  // unique index
  address: {type: String, unique: true},

  type: String, // static, dymanic
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = ContractSchema;

