'use strict';

const fs = require('fs');
const crypto = require('crypto');
const test = require('tape');
const OpenTimestamps = require('javascript-opentimestamps');
const ConvertOTS = require('../src/convert2ots.js');
const Insight = require('../src/insight.js');
const Tools = require('../src/tools.js');

// OpenTimestamps shortcuts
// const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
// const Context = OpenTimestamps.Context;
// const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;
// Const Utils = OpenTimestamps.Utils;
// Const Notary = OpenTimestamps.Notary;

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

test('merkle root', assert => {
  const txs = [];
  txs.push(Tools.hexToBytes('8506933d3bad1aaefb3c835d90912c1896349c7a94e9b576941ce4a52d47c8ca'));
  txs.push(Tools.hexToBytes('9d7847a90e5957fa87e1aca27e88dc3e4da3b1cd71a9e0c812ca6a205c634829'));

  const merkleroot = Tools.hexToBytes('6cfb0e7f8fadebd617c711618dfc4b25bea286d323df98d7c152699d177f1ff6');

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
  assert.true(Tools.arrEq(merkleTip.msg, merkleroot.reverse()));

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
      const bytes = Tools.hexToBytes(hash).reverse();
      const digest = OpenTimestamps.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), bytes);
      merkleRoots.push(digest.timestamp);
      digests.push(digest);
    });

      // Build merkle tree
    const merkleTip = ConvertOTS.makeMerkleTree(merkleRoots);
    assert.true(merkleTip !== undefined);

    const merkleRoot = Tools.hexToBytes(block.merkleroot).reverse();
    assert.true(Tools.arrEq(merkleTip.msg, merkleRoot));
    assert.end();
  });
});
/*
test('chainpoint_v2', assert => {
  const url = 'examples/chainpoint_v2.json';
  const chainpoint = JSON.parse(fs.readFileSync(url, 'utf8'));
  assert.true(chainpoint !== undefined);

  const result = ConvertOTS.checkValidHeaderChainpoint2(chainpoint);
  assert.true(result);

  const merkleRoot = ConvertOTS.calculateMerkleRootChainpoint2(chainpoint.targetHash, chainpoint.proof);
  assert.true(merkleRoot !== undefined);
  assert.equal(merkleRoot, chainpoint.merkleRoot);

  const timestamp = ConvertOTS.migrationChainpoint2(chainpoint.targetHash, chainpoint.proof);
  assert.true(timestamp !== undefined);
  assert.true(Tools.arrEq(timestamp.msg, Tools.hexToBytes(chainpoint.targetHash)));

    // Add intermediate unknow attestation
    try {
        ConvertOTS.migrationAttestationsChainpoint2(chainpoint.anchors, timestamp);
    } catch (err) {
        assert.true(0);
    }

    // Resolve unknown attestations
    const promises = [];
    const stampsAttestations = timestamp.directlyVerified();
    stampsAttestations.forEach(subStamp => {
        subStamp.attestations.forEach(attestation => {
            // Console.log('Find op_return: ' + Tools.bytesToHex(attestation.payload));
            const txHash = Tools.bytesToHex(attestation.payload);
            promises.push(ConvertOTS.resolveAttestation(txHash, subStamp, true));
        });
    });
    // Callback with the full attestation
    Promise.all(promises.map(Tools.hardFail))
        .then(() => {
            // Print attestations
            const attestations = timestamp.getAttestations();
            assert.true(attestations.size > 0);

            // Deserialize
            const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
            const ctx = new Context.StreamSerialization();
            detached.serialize(ctx);
            assert.true( ctx.getOutput().length > 0);
            assert.end();
        })
        .catch(err => {
            assert.true(0);
            assert.end(0);
        });
});
*/

test('chainpoint_v3', assert => {
  const url = 'examples/chainpoint_v3.json';
  const chainpoint = JSON.parse(fs.readFileSync(url, 'utf8'));
  assert.true(chainpoint !== undefined);

  const result = ConvertOTS.checkValidHeaderChainpoint3(chainpoint);
  assert.true(result !== undefined);

  let merkleRoot = {};
  let calendarRoot = {};
  chainpoint.branches.forEach(branch => {
    if (branch.label === 'cal_anchor_branch') {
      calendarRoot = ConvertOTS.calculateMerkleRootChainpoint3(chainpoint.hash, branch.ops);
      assert.true(calendarRoot !== undefined);
      branch.branches.forEach(subBranch => {
        if (subBranch.label === 'btc_anchor_branch') {
          merkleRoot = ConvertOTS.calculateMerkleRootChainpoint3(calendarRoot, subBranch.ops);
          assert.true(merkleRoot !== undefined);
        }
      });
    }
  });
  assert.true(merkleRoot !== undefined);
  const merkleroot = 'c617f5faca34474bea7020d75c39cb8427a32145f9646586ecb9184002131ad9';
  assert.true(Tools.arrEq(Tools.hexToBytes(merkleroot).reverse(), Tools.hexToBytes(merkleRoot)));

    // migration
  let timestampMerkleRoot = {};
  let timestampCalRoot = {};
  chainpoint.branches.forEach(branch => {
    if (branch.label === 'cal_anchor_branch') {
      timestampCalRoot = ConvertOTS.migrationChainpoint3(chainpoint.hash, branch.ops);
      assert.true(timestampCalRoot !== undefined);
      branch.branches.forEach(subBranch => {
        if (subBranch.label === 'btc_anchor_branch') {
          timestampMerkleRoot = ConvertOTS.migrationChainpoint3(calendarRoot, subBranch.ops);
          assert.true(timestampMerkleRoot !== undefined);
        }
      });
    }
  });

  ConvertOTS.concatTimestamp(timestampCalRoot, timestampMerkleRoot);

  assert.end();
});
