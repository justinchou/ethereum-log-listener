const Fs = require('fs');
const Path = require('path');

const files = Fs.readdirSync(Path.join(__dirname, '.'));
const mapper = {};

files
  .filter(file => {
    return file !== 'index.js';
  })
  .map(file => {
    const names = file.split('.');
    const filePath = Path.join(__dirname, file);

    mapper[names[0]] = require(filePath);
  });

module.exports = mapper;

