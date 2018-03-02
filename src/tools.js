
const OpenTimestamps = require('javascript-opentimestamps');

// OpenTimestamps shortcuts
// const Timestamp = OpenTimestamps.Timestamp;
// const Ops = OpenTimestamps.Ops;
const Utils = OpenTimestamps.Utils;
// Const Notary = OpenTimestamps.Notary;

// Convert a hex string to a buffer
exports.hexToString = function (hex) {
  return Buffer.from(hex, 'hex');
};

// Convert a byte array to a hex string
exports.bytesToHex = function (bytes) {
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push((bytes[i] >>> 4).toString(16));
    hex.push((bytes[i] & 0xF).toString(16));
  }
  return hex.join('');
};

exports.arrEq = function (arr1, arr2) {
  return Utils.arrEq(arr1, arr2);
};

exports.hardFail = function (promise) {
  return new Promise((resolve, reject) => {
    promise
            .then(resolve)
            .catch(reject);
  });
};

exports.softFail = function (promise) {
  return new Promise(resolve => {
    promise
            .then(resolve)
            .catch(resolve);
  });
};

// Convert a hex string to a byte array
exports.hexToBytes = function (hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2)		{
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};

exports.isHex = function (h) {
  const regexp = /^[0-9a-fA-F]+$/;
  if (regexp.test(h)) {
    return true;
  }

  return false;
};

exports.String2Hex = function (tmp) {
  let str = '';
  for (let i = 0; i < tmp.length; i++) {
    str += tmp[i].charCodeAt(0).toString(16);
  }
  return str;
};
