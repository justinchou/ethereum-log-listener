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
