/**
 * @maker Joey Whelan
 * @fileoverview API endpoint tests
 */

import got from 'got';

async function suggest(address) {
    const result = await got
    .get(`http://localhost:8000/address/suggest?address=${encodeURI(address)}`, {}).json();
    console.log(result);
    return(result);
}

async function search(address) {
    const result = await got
    .get(`http://localhost:8000/address/search?address=${encodeURI(address)}`, {}).json();
    console.log(`total accounts: ${result.total}`)
    console.log(`first 3 accounts matching: ${address} ${JSON.stringify(result.accounts, null, 4)}`);
}

(async () => {
    const address = "Range";
    const res = await suggest(address);
    await search(res[0].address);
})();
