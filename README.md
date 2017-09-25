## convert2ots
Convert bitcoin timestamp proof ( like Chainpoint v2 ) to OpenTimestamps proof.

#### Example
Chainpoint valid receipt from [https://github.com/chainpoint/chainpoint-validate-js](https://github.com/chainpoint/chainpoint-validate-js) and save to receipt.json
```json
{
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
}
```
Run conversion tool to generate receipt.ots
```
$ node index.js --chainpoint examples/chainpoint.json --output receipt.ots
```
OpenTimestamp proof receipt.ots (BitcoinTransactionAttestation is still unsupported)
```
$ ots info receipt.ots
File sha256 hash: bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2
Timestamp:
prepend bdf8c9bdf076d6aff0292a1c9448691d2ae283f2ce41b045355e2c8cb8e85ef2
sha256
prepend cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf
sha256
append cb0dbbedb5ec5363e39be9fc43f56f321e1572cfcf304d26fc67cb6ea2e49faf
sha256
verify BitcoinTransactionAttestation(f3be82fe1b5d8f18e009cb9a491781289d2e01678311fe2b2e4e84381aafadee)
```
