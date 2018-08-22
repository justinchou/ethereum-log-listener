const Path               = require('path');
const Web3               = require('web3');
const Utils              = require('util');
const Logger             = require('bearcatjs-logger');
Logger.configure(Path.join(__dirname, './config/logger.json'));

const config             = require('config');

const Service            = require('./src/services');
const logger             = Logger.getLogger('main');

logger.info('Using Config [ %j ] [ %j ]', config, process.env);

let wssProvider = new Web3.providers.WebsocketProvider(config.get('rpc.providerUrl'), config.get('rpc.options'));

wssProvider.on('connect', (...argv) => logger.info('Web3 Connecting.... %j', Utils.inspect(argv)));
wssProvider.on('error', err => {
  if (process.env.NODE_ENV === 'sphinxchain')
    Service.sendErrorNotify(`Watch Dog Infura Connection Error ${err.message}`, err.stack);
  logger.error('%j Web3 Wss Connection Error', new Date(), err);
  process.exit(125);
});
wssProvider.on('end', (...argv) => {
  if (process.env.NODE_ENV === 'sphinxchain')
    Service.sendErrorNotify(`Watch Dog Infura Connection Ended`, '');
  logger.error('%j Web3 Wss Connection End', new Date(), Utils.inspect(argv));
  process.exit(126);
});

let web3 = new Web3(wssProvider);

config.contractMetas = Path.join('node_modules/sphinx-meta', `${config.get('rpc.contractEnvName')}`, 'build/contracts')


const {loadAllABIFromBuild} = require('./lib/Utils');
const {contracts, address2name, topic2name} = loadAllABIFromBuild(this.config.contractMetas);

logger.info('a2n      len [ %s ] [ %j ] \n', Object.keys(address2name).length , address2name          );
logger.info('t2n      len [ %s ] [ %j ] \n', Object.keys(topic2name).length   , topic2name            );
logger.info('contract len [ %s ] [ %j ] \n', Object.keys(contracts).length    , Object.keys(contracts));

