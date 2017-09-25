'use strict';

/**
 * convert2ots
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
const Context = OpenTimestamps.Context;
const DetachedTimestampFile = OpenTimestamps.DetachedTimestampFile;

// Local dependecies
const Tools = require('./tools.js');


// Constants
const path = process.argv[1].split('/');
const title = path[path.length - 1];


// Parse parameters
program
    .version(require('./package.json').version)
    .description('Convert bitcoin timestamp proof ( like Chainpoint v2 ) to OpenTimestamps proof.')
    .option('-c, --chainpoint <file>', 'Chainpoint proof')
    .option('-o, --output <file>', 'Output OTS proof')
    .parse(process.argv);

const chainpointFile = program.chainpoint;
const otsFile = program.output;
if(chainpointFile == undefined || otsFile == undefined){
    program.help();
    return;
}
const chainpoint = JSON.parse(fs.readFileSync(chainpointFile, 'utf8'));

// Check chainpoint file
if (chainpoint["@context"] !== "https://w3id.org/chainpoint/v2"){
    console.error("Support only chainpoint v2");
    return;
}
if (chainpoint["type"] !== "ChainpointSHA256v2"){
    console.error("Support only ChainpointSHA256v2");
    return;
}
if (chainpoint["anchors"] === undefined){
    console.error("Support only timestamps with attestations");
    return;
}

// Check valid chainpoint merkle
var merkleRoot = calculateMerkleRoot(chainpoint.targetHash,chainpoint.proof);
if (merkleRoot !== chainpoint.merkleRoot){
    console.error("Invalid merkle root");
    return;
}

// Migrate proof
try {
    var timestamp = migration(chainpoint.targetHash, chainpoint.proof);
    console.log(timestamp.strTree(0, 1));
}catch (err){
    console.log("Building error");
    return;
}

// Migrate attestation
chainpoint.anchors.forEach(function (anchor) {
    var attestation = undefined;
    if(anchor.type === "BTCOpReturn"){

        const tag = [0x68, 0x7f, 0xe3, 0xfe, 0x79, 0x5e, 0x9a, 0x0d];
        attestation = new Notary.UnknownAttestation(tag, Tools.hexToBytes(anchor.sourceId));
        addAttestation(timestamp, attestation);

        // Print timestamp
        console.log(timestamp.strTree(0,1));

        // Store to file
        saveTimestamp(otsFile, timestamp);

        /*getBlockHeight(anchor.sourceId).then((height)=>{
            const tag = [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];
            attestation = new Notary.UnknownAttestation(tag,height);
            addAttestation(timestamp, attestation);

            // Print timestamp
            console.log(timestamp.strTree(0,1));

            // Store to file
            saveTimestamp(otsFile, timestamp);

        }).catch((err)=>{
            console.log("Attestation error");
        })*/
    }
})


// Migrate proofs
function migration(targetHash, proof){
    var prev = targetHash;

    var timestamp = new Timestamp(Utils.hexToBytes(targetHash));
    var tip = timestamp;

    for (var i = 0; i < proof.length; i++) {
        var item = proof[i];
        var op = undefined;
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
        var item = proof[i];
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

// Save ots file
function saveTimestamp(filename, timestamp){
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
