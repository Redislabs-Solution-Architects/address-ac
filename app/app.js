/**
 * @maker Joey Whelan
 * @fileoverview Express-based API server
 */
import { createClient } from 'redis';
import express from 'express';
import { Worker } from 'worker_threads';
const port = process.env.APP_PORT || 8000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
var client;
const app = express();
app.use(express.json());
app.use(express.static('./app/public'));

/**
 * Address suggestion endpoint.  Determines if the query param starts with a digit.
 * If so, it uses the full address dictionary (street num + street name + city + province) for suggestions.  
 * If not, it uses the partial dictionary (street name + city + province)
 */
app.get('/address/suggest', async (req, res) => {
    const address = decodeURI(req.query.address);
    console.log(`app - GET /address/suggest ${address}`);
   
    try {
        let addrs;
        if (address.match(/^\d/)) {
            addrs = await client.ft.sugGet(`fAdd`, address);
        }
        else {
            addrs = await client.ft.sugGet(`pAdd`, address);
        }
        let suggestions = []
        for (const addr of addrs) {
            suggestions.push({address: addr})
        }
        res.status(200).json(suggestions);
    }
    catch (err) {
        console.error(`app - GET /address/suggest ${req.query.address} - ${err.message}`)
        res.status(400).json({ 'error': err.message });
    }
});

/**
 * Full address search end point.  It will accept either a full or partial address and return
 * the matches from a full-text search.
 */
app.get('/address/search', async (req, res) => {
    const address = decodeURI(req.query.address);
    console.log(`app - GET /address/search ${address}`);
    
    try {
        const sres = await client.ft.search('addIdx', `(@address:${address})`, 
            {SORTBY:'address', LIMIT: {from: 0, size: 3}});
        if (sres && sres.documents) {
            let accounts = [];
            for (let doc of sres.documents) {
                accounts.push(doc.value)
            }
            res.status(200).json({
                'accounts': accounts,
                'total': sres.total
            });
        }
        else {
            res.status(401).send('address not found');
        }
    }
    catch (err) {
        res.status(400).json({ 'error': err.message });
    }
});

app.listen(port, async () => {
    client = createClient({url: redisUrl});
    client.on('error', (err) => {
        console.error(err.message);
    });  
    await client.connect();
    if (!await client.exists('load-complete')) {
        console.log(`app wd: ${process.cwd()}`)
        new Worker('./app/dataLoader.js');
    }
    console.log(`Server is up - http://localhost:${port}`)
});