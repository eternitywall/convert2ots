#!/usr/bin/env node
'use strict';

/**
 * Convert2ots
 * @module Index
 * @author EternityWall
 * @license LPGL3
 */

// Dependencies
const fs = require('fs');
const OpenTimestamps = require('javascript-opentimestamps');
// Comment : const request = require('request-promise');
const program = require('commander');

// OpenTimestamps shortcuts
// const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
// Const Utils = OpenTimestamps.Utils;
// Const Notary = OpenTimestamps.Notary;
const Context = OpenTimestamps.Context;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

// Local dependecies
const ConvertOTS = require('./src/convert2ots.js');
const Tools = require('./src/tools.js');

// Parse parameters
program
    .version(require('./package.json').version)
    .description('Convert bitcoin timestamp proof ( like Chainpoint v2/v3 ) to OpenTimestamps proof.')
    .option('-c, --chainpoint <file>', 'Chainpoint proof')
    .option('-o, --output <file>', 'Output OTS proof')
    .option('-n, --nobitcoin', 'Use lite-verification with insight block explorer instead local Bitcoin node')
    .parse(process.argv);

const chainpointFile = program.chainpoint;
const otsFile = program.output;
if (chainpointFile === undefined || otsFile === undefined) {
  program.help();
  process.exit(1);
}

// Read file
let chainpoint;
try {
  chainpoint = JSON.parse(fs.readFileSync(chainpointFile, 'utf8'));
} catch (err) {
  console.log('Read file error');
  process.exit(1);
}

// Check chainpoint file
const SupportedFormat = {CHAINPOINTv2: 1, CHAINPOINTv3: 2};
let format = '';
if (ConvertOTS.checkValidHeaderChainpoint2(chainpoint)) {
  format = SupportedFormat.CHAINPOINTv2;
  console.log('Chainpoint v2 file format');
  console.log('File type: ' + chainpoint.type);
  console.log('Target hash: ' + chainpoint.targetHash);
} else if (ConvertOTS.checkValidHeaderChainpoint3(chainpoint)) {
  format = SupportedFormat.CHAINPOINTv3;
  console.log('Chainpoint v3 file format');
  console.log('File type: ' + chainpoint.type);
  console.log('Target hash: ' + chainpoint.hash);
} else {
  console.log('Supported only chainpoint v2 or v3 file');
  process.exit(1);
}

// Check and generate merkle tree
let merkleRoot = {};
let calendarRoot = {};

if (format === SupportedFormat.CHAINPOINTv2) {
  merkleRoot = ConvertOTS.calculateMerkleRootChainpoint2(chainpoint.targetHash, chainpoint.proof);
  if (merkleRoot !== chainpoint.merkleRoot) {
    console.log('Invalid merkle root');
    process.exit(1);
  }
} else if (format === SupportedFormat.CHAINPOINTv3) {
  chainpoint.branches.forEach(branch => {
    if (branch.label === 'cal_anchor_branch') {
      calendarRoot = ConvertOTS.calculateMerkleRootChainpoint3(chainpoint.hash, branch.ops);
      branch.branches.forEach(subBranch => {
        if (subBranch.label === 'btc_anchor_branch') {
          merkleRoot = ConvertOTS.calculateMerkleRootChainpoint3(calendarRoot, subBranch.ops);
        }
      });
    }
  });
}

// Check and migrate attestations of the proof
if (format === SupportedFormat.CHAINPOINTv2) {
    /* Chainpoint v2: the attestation is anchor to op_return of the transaction.
     * In order to resolve the full attestation to the merkle root of the block
     * we use a lite verification (with the insight) or bitcoin node. */
  let timestamp = {};
  try {
    timestamp = ConvertOTS.migrationChainpoint2(chainpoint.targetHash, chainpoint.proof);
    if (timestamp === undefined) {
      throw String('Invalid timestamp');
    }
  } catch (err) {
    console.log('Building error: ' + err);
    process.exit(1);
  }
    // Add intermediate unknow attestation
  try {
    ConvertOTS.migrationAttestationsChainpoint2(chainpoint.anchors, timestamp);
        // Console.log(timestamp.strTree(0, 1));
  } catch (err) {
    console.log('Attestation error');
    process.exit(1);
  }
    // Resolve unknown attestations
  const promises = [];
  const stampsAttestations = timestamp.directlyVerified();
  stampsAttestations.forEach(subStamp => {
    subStamp.attestations.forEach(attestation => {
            // Console.log('Find op_return: ' + Tools.bytesToHex(attestation.payload));
      const txHash = Tools.bytesToHex(attestation.payload);
      promises.push(ConvertOTS.resolveAttestation(txHash, subStamp, program.nobitcoin));
    });
  });
    // Callback with the full attestation
  Promise.all(promises.map(Tools.hardFail))
        .then(() => {
            // Print attestations
          const attestations = timestamp.getAttestations();
          attestations.forEach(attestation => {
            console.log('OTS attestation: ' + attestation.toString());
          });

            // Store to file
          saveTimestamp(otsFile, timestamp);
        })
        .catch(err => {
          console.log('Resolve attestation error: ' + err);
          process.exit(1);
        });
} else if (format === SupportedFormat.CHAINPOINTv3) {
    /* Chainpoint v3: the attestation is anchor to block height.
         * In order to resolve to check the merkle root of the block height,
         * we use a lite verification (with the insight) or bitcoin node. */

  let timestampMerkleRoot = {};
  let timestampCalRoot = {};
  chainpoint.branches.forEach(branch => {
    if (branch.label === 'cal_anchor_branch') {
      timestampCalRoot = ConvertOTS.migrationChainpoint3(chainpoint.hash, branch.ops);
      branch.branches.forEach(subBranch => {
        if (subBranch.label === 'btc_anchor_branch') {
          timestampMerkleRoot = ConvertOTS.migrationChainpoint3(calendarRoot, subBranch.ops);
        }
      });
    }
  });
  // Concat temporany calendar proof with bitcoin merkle proof
  ConvertOTS.concatTimestamp(timestampCalRoot, timestampMerkleRoot);

    // Print attestations
  const attestations = timestampCalRoot.getAttestations();
  attestations.forEach(attestation => {
    console.log('OTS attestation: ' + attestation.toString());
  });

    // Store to file
  try {
    saveTimestamp(otsFile, timestampCalRoot);
  } catch (err) {
    console.log('Saving ots error');
    process.exit(1);
  }
}

// Save ots file
function saveTimestamp(filename, timestamp) {
  const detached = new DetachedTimestampFile(new Ops.OpSHA256(), timestamp);
  const ctx = new Context.StreamSerialization();
  detached.serialize(ctx);
  saveOts(filename, ctx.getOutput());
}

function saveOts(otsFilename, buffer) {
  fs.exists(otsFilename, fileExist => {
    if (fileExist) {
      console.log('The timestamp proof \'' + otsFilename + '\' already exists');
    } else {
      fs.writeFile(otsFilename, buffer, 'binary', err => {
        if (err) {
          return console.log(err);
        }
        console.log('The timestamp proof \'' + otsFilename + '\' has been created!');
      });
    }
  });
}
