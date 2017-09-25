'use strict';

/**
 * Tools module.
 * @module Utils
 * @author EternityWall
 * @license LPGL3
 */

// Dependencies
const crypto = require('crypto');
const OpenTimestamps = require('javascript-opentimestamps');

// OpenTimestamps shortcuts
const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
const Utils = OpenTimestamps.Utils;
const Notary = OpenTimestamps.Notary;

// Check chainpoint receipt
exports.checkValidHeader = function (chainpoint) {
  if (chainpoint['@context'] !== 'https://w3id.org/chainpoint/v2') {
    console.error('Support only chainpoint v2');
    return false;
  }
  if (chainpoint.type !== 'ChainpointSHA256v2') {
    console.error('Support only ChainpointSHA256v2');
    return false;
  }
  if (chainpoint.anchors === undefined) {
    console.error('Support only timestamps with attestations');
    return false;
  }
  return true;
};

// Migrate proofs
exports.migrationMerkle = function (targetHash, proof) {
  let timestamp = new Timestamp(Utils.hexToBytes(targetHash));
  const tip = timestamp;

  for (let i = 0; i < proof.length; i++) {
    const item = proof[i];
    let op;
    if (item.left !== undefined) {
      op = new Ops.OpPrepend(Utils.hexToBytes(item.left));
    } else if (item.right !== undefined) {
      op = new Ops.OpAppend(Utils.hexToBytes(item.right));
    }
    timestamp = timestamp.add(op);
    const opSHA256 = new Ops.OpSHA256();
    timestamp = timestamp.add(opSHA256);
  }
  return tip;
};

// Add OTS attestation
exports.addAttestation = function (timestamp, attestation) {
  if (timestamp.ops.size === 0) {
    timestamp.attestations.push(attestation);
    return true;
  }

  timestamp.ops.forEach(stamp => {
    this.addAttestation(stamp, attestation);
  });
};

// Migrate attestation
exports.migrationAttestations = function (anchors, timestamp) {
  const self = this;
  anchors.forEach(anchor => {
    let attestation;
    if (anchor.type === 'BTCOpReturn') {
      const tag = [0x68, 0x7F, 0xE3, 0xFE, 0x79, 0x5E, 0x9A, 0x0D];
      attestation = new Notary.UnknownAttestation(tag, this.hexToBytes(anchor.sourceId));
      self.addAttestation(timestamp, attestation);

        /* GetBlockHeight(anchor.sourceId).then((height)=>{
            const tag = [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];
            attestation = new Notary.UnknownAttestation(tag,height);
            addAttestation(timestamp, attestation);

            // Print timestamp
            console.log(timestamp.strTree(0,1));

            // Store to file
            saveTimestamp(otsFile, timestamp);

        }).catch((err)=>{
            console.log("Attestation error");
        }) */
    }
  })
    ;
};

// Get block height from transaction
/*
async function getBlockHeight(txid) {
  const url = 'https://search.bitaccess.co/insight-api/tx/' + txid;
  const options = {
    method: 'GET',
    json: true,
    uri: url
  };
  try {
    const response = await
        request(options);
    return Promise.resolve(response.blockheight);
  } catch (error) {
    Promise.reject(error);
  }
}
*/
// Proof functions
exports.calculateMerkleRoot = function (targetHash, proof) {
  let left;
  let right;
  let prev = targetHash;

  for (let i = 0; i < proof.length; i++) {
    const item = proof[i];
    if (item.left !== undefined) {
      left = item.left;
      right = prev;
    } else if (item.right !== undefined) {
      left = prev;
      right = item.right;
    }
    const result = crypto.createHash('sha256').update(this.hexToString(left)).update(this.hexToString(right)).digest('hex');
    prev = result;
  }
  return prev;
};

// Convert a hex string to a byte array
exports.hexToBytes = function (hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2)		{
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};

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
