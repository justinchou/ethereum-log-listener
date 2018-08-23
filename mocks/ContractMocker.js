const Logger     = require('bearcatjs-logger');
const logger     = Logger.getLogger();
require('../lib/Utils');

const ADDRSTR = '1234567890abcdef';

function mockContractAddress() {
  let addr = '0x';

  for (let i=0; i<40; i++) {
    addr += Array.from(ADDRSTR)[Math.floor(Math.random() * ADDRSTR.length)];
  }

  return addr.toChecksumAddress();
}

module.exports = {mockContractAddress};

