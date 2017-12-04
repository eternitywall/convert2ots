'use strict';

const fs = require('fs');
const crypto = require('crypto');
const test = require('tape');
const OpenTimestamps = require('javascript-opentimestamps');
const ConvertOTS = require('./libconvert.js');
const Insight = require('./insight.js');

// OpenTimestamps shortcuts
// const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
const Utils = OpenTimestamps.Utils;
// Const Notary = OpenTimestamps.Notary;

const url = 'examples/chainpoint.json';

test('test validation merkle tree', assert => {
  const targetHash = 'bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2';
  const merkleRoot = '51296468ea48ddbcc546abb85b935c73058fd8acdb0b953da6aa1ae966581a7a';
    // Console.log("targetHash: " + targetHash);

  const left1 = 'bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2';
  const right1 = targetHash;
    // Console.log("left1: " + left1);
    // console.log("right1: " + right1);

  const left2 = 'cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf';
  const right2 = crypto.createHash('sha256').update(ConvertOTS.hexToString(left1)).update(ConvertOTS.hexToString(right1)).digest('hex');
    // Console.log("left2: " + left2);
    // console.log("right2: " + right2);

  const right3 = 'cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf';
  const left3 = crypto.createHash('sha256').update(ConvertOTS.hexToString(left2)).update(ConvertOTS.hexToString(right2)).digest('hex');
    // Console.log("right3: " + right3);
    // console.log("left3: " + left3);

  const top = crypto.createHash('sha256').update(ConvertOTS.hexToString(left3)).update(ConvertOTS.hexToString(right3)).digest('hex');
    // Console.log("top: " + top);
    // console.log("merkleRoot: " + merkleRoot);

  assert.equal(top, merkleRoot);
  assert.end();
});

test('test migration', assert => {
  const chainpoint = JSON.parse(fs.readFileSync(url, 'utf8'));
  assert.true(chainpoint !== undefined);

  const merkleRoot = ConvertOTS.calculateMerkleRoot(chainpoint.targetHash, chainpoint.proof);
  assert.true(merkleRoot !== undefined);
  assert.equal(merkleRoot, chainpoint.merkleRoot);

  const timestamp = ConvertOTS.migrationMerkle(chainpoint.targetHash, chainpoint.proof);
  assert.true(timestamp !== undefined);
  assert.true(ConvertOTS.arrEq(timestamp.msg, ConvertOTS.hexToBytes(chainpoint.targetHash)));

  assert.end();
});

test('merkle root', assert => {
  const txs = [];
  txs.push(ConvertOTS.hexToBytes('8506933d3bad1aaefb3c835d90912c1896349c7a94e9b576941ce4a52d47c8ca'));
  txs.push(ConvertOTS.hexToBytes('9d7847a90e5957fa87e1aca27e88dc3e4da3b1cd71a9e0c812ca6a205c634829'));

  const merkleroot = ConvertOTS.hexToBytes('6cfb0e7f8fadebd617c711618dfc4b25bea286d323df98d7c152699d177f1ff6');

  const digests = [];
  txs.forEach(tx => {
    const digest = OpenTimestamps.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), tx.reverse());
    digests.push(digest);
  });

  const merkleRoots = [];
  digests.forEach(digest => {
    merkleRoots.push(digest.timestamp);
  });

  const merkleTip = ConvertOTS.makeMerkleTree(merkleRoots);
  assert.true(merkleTip !== undefined);
  assert.true(ConvertOTS.arrEq(merkleTip.msg, merkleroot.reverse()));

  assert.end();
});

test('merkle root of block', assert => {
  // Const blockHash = "000000000000000000e45bba92056fab483a3588e4936cc495831728969d749e";
  // const blockHash = "000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506"; // 2 tx
  // const blockHash = "0000000000010ac94a7f73848a32a33238e34162df6b4118e6e37fa2ae986e72"; // 3 tx
  // const blockHash = "00000000000237a048b03b9faa713cf3d95d25c76f82f8083a1267ee12d74ae9"; // 4 tx
  // const blockHash = '000000000000b0b8b4e8105d62300d63c8ec1a1df0af1c2cdbd943b156a8cd79'; // 6 tx
  // const blockHash = "00000000000475b5f4f382fe7468e8f2b02e91fb715ac8ed58472ef16d85ffba"; // 8 tx
    // const blockHash = "00000000000080b66c911bd5ba14a74260057311eaeb1982802f7010f1a9f090"; // 12 tx
  const blockHash = '000000000000000000e45bba92056fab483a3588e4936cc495831728969d749e';

  const url = 'https://search.bitaccess.co/insight-api';
  const insight = new Insight.Insight(url);
  insight.block(blockHash).then(block => {
      // Prepare digest tx list
    const digests = [];
    const merkleRoots = [];
    block.tx.forEach(hash => {
      const bytes = ConvertOTS.hexToBytes(hash).reverse();
      const digest = OpenTimestamps.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), bytes);
      merkleRoots.push(digest.timestamp);
      digests.push(digest);
    });

      // Build merkle tree
    const merkleTip = ConvertOTS.makeMerkleTree(merkleRoots);
    assert.true(merkleTip !== undefined);

    const merkleRoot = Utils.hexToBytes(block.merkleroot).reverse();
    assert.true(ConvertOTS.arrEq(merkleTip.msg, merkleRoot));
    assert.end();
  });
});
