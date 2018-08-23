const Path               = require('path');
const Utils              = require('util');
const Logger             = require('bearcatjs-logger');
Logger.configure(Path.join(__dirname, './config/logger.json'));

const config             = require('config');

const Service            = require('./src/services');
const logger             = Logger.getLogger('main');

logger.info('Using Config [ %j ] [ %j ]', config, process.env);


config.contractMetas = Path.join('node_modules/sphinx-meta', `${config.get('rpc.contractEnvName')}`, 'build/contracts')


const {loadAllABIFromBuild} = require('./lib/Utils');
const {contracts, address2name, topic2name} = loadAllABIFromBuild(this.config.contractMetas);

logger.info('a2n      len [ %s ] [ %j ] \n', Object.keys(address2name).length , address2name          );
logger.info('t2n      len [ %s ] [ %j ] \n', Object.keys(topic2name).length   , topic2name            );
logger.info('contract len [ %s ] [ %j ] \n', Object.keys(contracts).length    , Object.keys(contracts));

