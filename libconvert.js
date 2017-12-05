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
const Insight = require('./insight.js');
const Tools = require('./tools.js');

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
  let timestamp = new Timestamp(Tools.hexToBytes(targetHash));
  const tip = timestamp;

  for (let i = 0; i < proof.length; i++) {
    const item = proof[i];
    let op;
    if (item.left !== undefined) {
      op = new Ops.OpPrepend(Tools.hexToBytes(item.left));
    } else if (item.right !== undefined) {
      op = new Ops.OpAppend(Tools.hexToBytes(item.right));
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
      attestation = new Notary.UnknownAttestation(tag, Tools.hexToBytes(anchor.sourceId));
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

exports.liteVerify = function () {
  return new Promise(resolve => {
    resolve(new Insight.MultiInsight());
  });
};

// Resolve attestation
exports.resolveAttestation = function (txHash, timestamp) {
  const self = this;
  return new Promise((resolve, reject) => {
    self.liteVerify().then(explorer => {
      explorer.rawtx(txHash)
            .then(rawtx => {
              const opReturn = Tools.bytesToHex(timestamp.msg);
              const pos = rawtx.indexOf(opReturn);
              if (pos === -1) {
                throw String('Invalid tx');
              }

              const append = Tools.hexToBytes(rawtx.substring(0, pos));
              const prepend = Tools.hexToBytes(rawtx.substring(pos + txHash.length, rawtx.length));

              let subStamp = timestamp.add(new Ops.OpPrepend(append));
              subStamp = subStamp.add(new Ops.OpAppend(prepend));
              subStamp = subStamp.add(new Ops.OpSHA256());
              subStamp.add(new Ops.OpSHA256());

              return explorer.tx(txHash);
            })
            .then(tx => {
              return explorer.block(tx.blockhash);
            })
            .then(block => {
                // Prepare digest tx list
              const digests = [];
              const merkleRoots = [];
              block.tx.forEach(hash => {
                const bytes = Tools.hexToBytes(hash).reverse();
                const digest = OpenTimestamps.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), bytes);
                merkleRoots.push(digest.timestamp);
                digests.push(digest);
              });

                // Build merkle tree
              const merkleTip = self.makeMerkleTree(merkleRoots);
              if (merkleTip === undefined) {
                throw String('Invalid merkle tree');
              } else if (!Tools.arrEq(merkleTip.msg, Tools.hexToBytes(block.merkleroot).reverse())) {
                throw String('Not match merkle tree');
              }

                // Add bitcoin attestation
              const attestation = new Notary.BitcoinBlockHeaderAttestation(block.height);
              merkleTip.attestations.push(attestation);

                // Check chainpoint anchor to merge
              digests.forEach(digest => {
                if (Tools.arrEq(digest.timestamp.msg, Tools.hexToBytes(txHash).reverse())) {
                  timestamp.attestations = []; // Remove unknown attestation
                  let subStamp = timestamp.ops.values().next().value;
                  subStamp = subStamp.ops.values().next().value;
                  subStamp = subStamp.ops.values().next().value;
                  subStamp = subStamp.ops.values().next().value;
                  subStamp.ops = digest.timestamp.ops;
                }
              });

              resolve();
            })
            .catch(err => {
              reject(err);
            });
    })
        .catch(err => {
          reject(err);
        });
  });
};

exports.makeMerkleTree = function (timestamps) {
  let stamps = timestamps;
  let prevStamp;

  for (;;) {
    stamps = stamps[Symbol.iterator]();
    prevStamp = stamps.next().value;

    const nextStamps = [];
    for (const stamp of stamps) {
      if (prevStamp === undefined) {
        prevStamp = stamp;
      } else {
        nextStamps.push(this.catSha256d(prevStamp, stamp));
        prevStamp = undefined;
      }
    }

    if (nextStamps.length === 0) {
      return prevStamp;
    }
    if (prevStamp !== undefined) {
      nextStamps.push(this.catSha256d(prevStamp, prevStamp));
    }
    stamps = nextStamps;
  }
};

exports.catThenUnaryOp = function (UnaryOpCls, left, right) {
  if (!(left instanceof Timestamp)) {
    left = new Timestamp(left);
  }
  if (!(right instanceof Timestamp)) {
    right = new Timestamp(right);
  }

  const opAppend = new Ops.OpAppend(right.msg);
  const opPrepend = new Ops.OpPrepend(left.msg);

  left.add(opAppend);
  const rightPrependStamp = right.add(opPrepend);

    // Left and right should produce the same thing, so we can set the timestamp
    // of the left to the right
    // left.ops[OpAppend(right.msg)] = right_prepend_stamp
  left.ops.forEach((subStamp, subOp) => {
    if (Utils.arrEq(opAppend.arg, subOp.arg)) {
      subStamp.msg = rightPrependStamp.msg;
      subStamp.ops = rightPrependStamp.ops;
      subStamp.attestations = rightPrependStamp.attestations;
    }
  });

  if (Utils.arrEq(right.msg, left.msg)) {
    right.ops.delete(opPrepend);
  }

    // Return right_prepend_stamp.ops.add(unaryOpCls())
  const res = rightPrependStamp.add(new Ops.OpSHA256());
  return res;
};

exports.catSha256 = function (left, right) {
  return this.catThenUnaryOp(Ops.OpSHA256, left, right);
};

exports.catSha256d = function (left, right) {
  const sha256Timestamp = this.catSha256(left, right);
  return sha256Timestamp.add(new Ops.OpSHA256());
};

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
    const result = crypto.createHash('sha256').update(Tools.hexToString(left)).update(Tools.hexToString(right)).digest('hex');
    prev = result;
  }
  return prev;
};
