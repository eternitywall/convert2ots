'use strict';

const fs = require('fs');
const crypto = require('crypto');
const test = require('tape');
const Tools = require('./tools.js');

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
  const right2 = crypto.createHash('sha256').update(Tools.hexToString(left1)).update(Tools.hexToString(right1)).digest('hex');
    // Console.log("left2: " + left2);
    // console.log("right2: " + right2);

  const right3 = 'cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf';
  const left3 = crypto.createHash('sha256').update(Tools.hexToString(left2)).update(Tools.hexToString(right2)).digest('hex');
    // Console.log("right3: " + right3);
    // console.log("left3: " + left3);

  const top = crypto.createHash('sha256').update(Tools.hexToString(left3)).update(Tools.hexToString(right3)).digest('hex');
    // Console.log("top: " + top);
    // console.log("merkleRoot: " + merkleRoot);

  assert.equal(top, merkleRoot);
  assert.end();
});

test('test migration', assert => {
  const chainpoint = JSON.parse(fs.readFileSync(url, 'utf8'));
  assert.true(chainpoint !== undefined);

  const merkleRoot = Tools.calculateMerkleRoot(chainpoint.targetHash, chainpoint.proof);
  assert.true(merkleRoot !== undefined);
  assert.equal(merkleRoot, chainpoint.merkleRoot);

  const timestamp = Tools.migrationMerkle(chainpoint.targetHash, chainpoint.proof);
  assert.true(timestamp !== undefined);
  assert.true(Tools.arrEq(timestamp.msg, Tools.hexToBytes(chainpoint.targetHash)));

  assert.end();
});
