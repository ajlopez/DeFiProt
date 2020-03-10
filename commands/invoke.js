
const rskapi = require('rskapi');
const utils = require('./lib/utils');

const config = utils.loadConfiguration('./config.json');

const client = rskapi.client(config.host);

const from = utils.getAccount(config, process.argv[2]);
const to = utils.getInstanceAddress(config, process.argv[3]);
const fn = process.argv[4];

let args;
let fast;

if (process.argv[5] === 'fast' && !process.argv[6]) {
    fast = true;
    args = null;
}
else {
    args = utils.getArguments(config, process.argv[5]);
    fast = process.argv[6] === 'fast';
}


(async function() {
    try {
        const txh = await client.invoke(from, to, fn, args);
        console.log('transaction', txh);
        
        if (fast)
            return;
        
        const txr = await client.receipt(txh, 0);
        console.log(txr && parseInt(txr.status) ? 'done' : 'failed');
    }
    catch (ex) {
        console.log(ex);
    }
})();

