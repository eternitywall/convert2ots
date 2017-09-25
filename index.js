'use strict';

/**
 * chainpoint2ots.
 * @module Index
 * @author EternityWall
 * @license LPGL3
 */

const crypto = require('crypto');
const OpenTimestamps = require('javascript-opentimestamps');
const request = require('request-promise');
const fs = require('fs');
const program = require('commander');

// OpenTimestamps shortcuts
const Timestamp = OpenTimestamps.Timestamp;
const Ops = OpenTimestamps.Ops;
const Utils = OpenTimestamps.Utils;
const Notary = OpenTimestamps.Notary;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

// Local dependecies
const Tools = require('./tools.js');


// Constants
const path = process.argv[1].split('/');
const title = path[path.length - 1];
let isExecuted = false;

// Parse parameters

program
    .version(require('./package.json').version);

const infoCommand = program
    .command('info [file_ots]')
    .alias('i')
    .option('-v, --verbose', 'Be more verbose.')
    .description('Show information on a timestamp.')
    .action((file, options) => {
    isExecuted = true;
if (!file) {
    console.log(infoCommand.helpInformation());
    return;
}
info(file, options);
});


// Check file
if (validReceipt["@context"] !== "https://w3id.org/chainpoint/v2"){
    console.error("Support only chainpoint v2");
    return;
}
if (validReceipt["type"] !== "ChainpointSHA256v2"){
    console.error("Support only ChainpointSHA256v2");
    return;
}
if (validReceipt["anchors"] === undefined){
    console.error("Support only timestamps with attestations");
    return;
}


// Check valid parsing
var merkleRoot = calculateMerkleRoot(validReceipt.targetHash,validReceipt.proof);
if (merkleRoot !== validReceipt.merkleRoot){
    console.error("Invalid merkle root");
    return;
}

// Migrate proof
try {
    var timestamp = migration(validReceipt.targetHash, validReceipt.proof);
    console.log(timestamp.strTree(0, 1));
}catch (err){
    console.log("Building error");
    return;
}

// Migrate attestation
validReceipt.anchors.forEach(function (anchor) {
    var attestation = undefined;
    if(anchor.type === "BTCOpReturn"){
        getBlockHeight(anchor.sourceId).then((height)=>{
            attestation = new Notary.BitcoinBlockHeaderAttestation(height);
            addAttestation(timestamp, attestation);
            console.log(timestamp.strTree(0,1));
        }).catch((err)=>{
            console.log("Attestation error");
        })
    }
})


// Migrate proofs
function migration(targetHash, proof){
    var prev = targetHash;

    var timestamp = new Timestamp(Utils.hexToBytes(targetHash));
    var tip = timestamp;

    for (var i = 0; i < proof.length; i++) {
        item = proof[i];
        op = undefined;
        if(item.left !== undefined){
            op = new Ops.OpPrepend(Utils.hexToBytes(item.left));
        } else if(item.right !== undefined){
            op = new Ops.OpAppend(Utils.hexToBytes(item.right));
        }
        timestamp = timestamp.add(op);
        const opSHA256 = new Ops.OpSHA256();
        timestamp = timestamp.add(opSHA256);

    };
    return tip;
}

// Add OTS attestation
function addAttestation(timestamp, attestation){
    if(timestamp.ops.size == 0){
        timestamp.attestations.push(attestation);
        return true;
    }

    timestamp.ops.forEach((stamp, op) => {
        addAttestation(stamp, attestation);
    })
}

// Get block height from transaction
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
    }
    catch (error) {
        Promise.reject(error);
    }
}

// Proof functions
function calculateMerkleRoot(targetHash, proof){
    var left = undefined;
    var right = undefined;
    var prev = targetHash;

    for (var i = 0; i < proof.length; i++) {
        item = proof[i];
        if(item.left !== undefined){
            left = item.left;
            right = prev;
        } else if(item.right !== undefined){
            left = prev;
            right = item.right;
        }
        var result = crypto.createHash('sha256').update(Tools.hexToString(left)).update(Tools.hexToString(right)).digest('hex');
        prev = result;
    };
    return prev;
}
