const test = require('tape');
const crypto = require('crypto');
const index = require('./index.js');
const Tools = require('./tools.js');

var validReceipt = {
    "@context": "https://w3id.org/chainpoint/v2",
    "type": "ChainpointSHA256v2",
    "targetHash": "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2",
    "merkleRoot": "51296468ea48ddbcc546abb85b935c73058fd8acdb0b953da6aa1ae966581a7a",
    "proof": [
        {
            "left": "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2"
        },
        {
            "left": "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf"
        },
        {
            "right": "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf"
        }
    ],
    "anchors": [
        {
            "type": "BTCOpReturn",
            "sourceId": "f3be82fe1b5d8f18e009cb9a491781289d2e01678311fe2b2e4e84381aafadee"
        }
    ]
};

test('test validation merkle tree', assert => {

    var targetHash = "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2";
    var merkleRoot = "51296468ea48ddbcc546abb85b935c73058fd8acdb0b953da6aa1ae966581a7a";
    //console.log("targetHash: " + targetHash);

    var left1 = "bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2";
    var right1 = targetHash;
    //console.log("left1: " + left1);
    //console.log("right1: " + right1);

    var left2 = "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf";
    var right2 = crypto.createHash('sha256').update(Tools.hexToString(left1)).update(Tools.hexToString(right1)).digest('hex');
    //console.log("left2: " + left2);
    //console.log("right2: " + right2);

    var right3 = "cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf";
    var left3 = crypto.createHash('sha256').update(Tools.hexToString(left2)).update(Tools.hexToString(right2)).digest('hex');
    //console.log("right3: " + right3);
    //console.log("left3: " + left3);

    var top = crypto.createHash('sha256').update(Tools.hexToString(left3)).update(Tools.hexToString(right3)).digest('hex');
    //console.log("top: " + top);
    //console.log("merkleRoot: " + merkleRoot);

    assert.equal(top, merkleRoot);
    assert.end();
});


test('test migration', assert => {



    assert.equal(top, merkleRoot);
    assert.end();
});