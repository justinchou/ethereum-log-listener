const Logger       = require('bearcatjs-logger');
const logger     = Logger.getLogger();

const CHECK_BLOCKS = 6e3;
const FAKE_BLOCKS  = 1.6e3;
const RANDOM_BASE  = Math.round(Math.random() * CHECK_BLOCKS) + 2e7;
const dbBlocks = [];

function mockFindBlockNumbers() {
  // make sure enough blocks
  for (let i = RANDOM_BASE - FAKE_BLOCKS; i < RANDOM_BASE; i++) {
    dbBlocks.push({blockNumber: i});
  }

  // not enough blocks
  for (let j = RANDOM_BASE; j < RANDOM_BASE + CHECK_BLOCKS; j++) {
    if (Math.random() < 0.99) {
      dbBlocks.push({blockNumber: j});
    }
  }

  const blocks = dbBlocks.length > CHECK_BLOCKS ? dbBlocks.slice(dbBlocks.length - CHECK_BLOCKS) : dbBlocks;
  return blocks;
}
module.exports = mockFindBlockNumbers;

