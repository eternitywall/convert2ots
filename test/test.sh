#!/usr/bin/env bash
echo --- START TESTING

echo ">> node index.js --chainpoint examples/chainpoint_v2.json --nobitcoin -o examples/chainpoint_v2.ots" && \
node index.js --chainpoint examples/chainpoint_v2.json --nobitcoin -o examples/chainpoint_v2.ots && \
echo ">> node ./node_modules/javascript-opentimestamps/ots-cli.js info examples/chainpoint_v2.ots" && \
node ./node_modules/javascript-opentimestamps/ots-cli.js info examples/chainpoint_v2.ots | grep "verify BitcoinBlockHeaderAttestation(421439)" && \
rm examples/chainpoint_v2.ots && \

echo ">> node index.js --chainpoint examples/chainpoint_v3.json --nobitcoin -o examples/chainpoint_v3.ots" && \
node index.js --chainpoint examples/chainpoint_v3.json --nobitcoin -o examples/chainpoint_v3.ots && \
echo ">> node ./node_modules/javascript-opentimestamps/ots-cli.js info examples/chainpoint_v3.ots" && \
node ./node_modules/javascript-opentimestamps/ots-cli.js info examples/chainpoint_v3.ots | grep "verify BitcoinBlockHeaderAttestation(503275)" && \
rm examples/chainpoint_v3.ots && \

echo --- END TESTING
