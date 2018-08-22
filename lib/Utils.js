const Fs = require('fs');
const {sha3, isAddress, toChecksumAddress} = require('web3').utils;

String.prototype.sha3 = function() {
  return sha3(this);
}

String.prototype.isAddress = function() {
  return isAddress(this);
}

String.prototype.toChecksumAddress = function() {
  return isAddress(this) ? toChecksumAddress(this) : this;
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};




function parseBlockInfo(block) {
  for (const blockItemId in block) {
    if (!block.hasOwnProperty(blockItemId)) continue;

    if (BN.isBN(block[blockItemId]))
      block[blockItemId] = new BigNumber(block[blockItemId]).toString();
  }

  if (block.transactions && Array.isArray(block.transactions)) {
    block.transactions = block.transactions
      .filter(transaction => transaction && typeof transaction === 'object' && transaction.blockHash)
      .map(transaction => {
        for (let [key, value] of Object.entries(transaction)) {
          if (BN.isBN(value)) transaction[key] = new BigNumber(value).toString();
        }
      });
  }

  logger.debug('Block Parsed Info: [ %j ]', block);
  return block;
}
exports.parseBlockInfo = parseBlockInfo;

function loadMetaFromBuild(metaFolder, contractName) {
  let file = Path.join(metaFolder, `${contractName}.json`);
  if (file.indexOf('/') !== 0) { file = '../../' + file; }
  
  let meta;
  try {
    const metaStr = Fs.readFileSync(file, 'utf8');
    meta = JSON.parse(meta);
  } catch (err) {
    logger.error('load %s from folder %s failed', contractName, metaFolder);
    throw err;
  }
  
  if (contractName !== meta.contractName) {
    logger.warn('contractName [ %s ] Is Different From Filename [ %s ]', meta.contractName, contractName);
  }
  
  return meta;
}
exports.loadMetaFromBuild = loadMetaFromBuild;

function loadAllABIFromBuild(metaFolder) {
  const contracts = {};
  const address2name = {};
  const topic2name = {};

  const files = Fs.readdirSync(metaFolder);

  files.filter(file => {
    const names = file.split('.');
    const extension = names[1];
    return extension === 'json';
  }).map(file => {
    const names = file.split('.');
    const filename = names[0];

    const meta = loadMetaFromBuild(metaFolder, filename);

    contracts[filename] = EthAbi.logDecoder(meta.abi);

    for (let network of meta.networks) {
      if (network && typeof network === 'object' && network.address) {
        this.address2name[network.address] = filename;
      }
    }

    meta.abi.filter(abi => abi.type === 'event').map(abi => {
      const {name, inputs} = abi;
      const args    = inputs.map(input => input.type);
      const hashStr = `${name}(${args.join(',')})`;
      const topic   = Web3Utils.sha3(hashStr);
      logger.debug('Hash [ %s ] Topic [ %s ]', hashStr, topic)
      this.topic2name[topic] = filename;
    });
  });

  return {contracts, address2name, topic2name};
}
exports.loadAllABIFromBuild = loadAllABIFromBuild;

function parseLogInfo(log) {
  if (log && Array.isArray(log)) {
    return log.map(value => {
      if (BN.isBN(value)) value = new BigNumber(value).toString();
      else if (value && (Array.isArray(value) || typeof value === 'object')) value = parseLogInfo(value);
      return value;
    });
  }

  if (log && typeof log === 'object') {
    for (let [key, value] of Object.entries(log)) {
      if (BN.isBN(value)) log[key] = new BigNumber(value).toString();
      else if (value && (Array.isArray(value) || typeof value === 'object')) log[key] = parseLogInfo(value);
    }
    return log;
  }
}
exports.parseLogInfo = parseLogInfo;


