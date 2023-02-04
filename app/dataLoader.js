/**
 * @maker Joey Whelan
 * @fileoverview Fetches address data zip files from a Canadian government stats site, extracts the csv file
 * from each, then writes the csv data to a JSON file.  The contents of that file is then inserted into
 * Redis as JSON documents.
 * 
 * This is executed as a worker thread from the Express server.
 */

import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import got from 'got';
import { pipeline } from 'node:stream/promises';
import { Stream } from 'node:stream';
import { createClient, SchemaFieldTypes } from 'redis';
import JSONStream from 'JSONStream';
import { createRequire } from 'module';
import AdmZip from 'adm-zip';
import { uniqueNamesGenerator, names } from 'unique-names-generator';
import { parse } from 'csv-parse';
import Path from 'path';

const require = createRequire(import.meta.url);
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_DIR = `${process.cwd()}/app/data`;

/**
 * @class Implements the zip file fetch, csv extract, and Redis load functions.
 */
class DataLoader {
    /**
     * Checks to see if the accounts.json file already exists.  If reads that file and inserts JSON
     * documents into Redis.
     */
    async load() {
        if (! fs.existsSync(`${DATA_DIR}/accounts.json`)) {   
            await this.#fetch();
        }

        const client = createClient({url: redisUrl});
        client.on('error', (err) => {
            console.error(err.message);
        });  
        await client.connect();
        await this.#index(client);

        const jsonStr = fs.createReadStream(`${DATA_DIR}/accounts.json`)
        .pipe(JSONStream.parse(['accounts', true]))
        .pipe(new Stream.PassThrough({objectMode: true}));
        
        console.log(`Inserting Documents`);
        let numDocs = 0;
        for await (const doc of jsonStr) {
            await this.#insert(client, doc)
            numDocs++;
            if (numDocs % 1000 == 0) {
                console.log(`${numDocs} documents inserted`)
            }
        }
        
        console.log(`${numDocs} documents inserted into Redis`);
        await client.set('load-complete', 'true');
        await client.disconnect();     
    };
    
    /**
     * If the accounts.json does not exist, this function creates it.  It fetches data zip files
     * from a Canada gov site, unzips/extracts csv files for province and then writes that data
     * to accounts.json.
     */
    async #fetch() {
        const sources = require(`${DATA_DIR}/sources.json`);
        for (const source of sources) {
            if (! fs.existsSync(`${DATA_DIR}/${source.province}.csv`)) {
                console.log(`Fetching ${source.url}`);
                await pipeline(
                    got.stream(source.url),
                    fs.createWriteStream(`${DATA_DIR}/${source.province}.zip`)
                )
                const zip = new AdmZip(`${DATA_DIR}/${source.province}.zip`);
                zip.extractEntryTo(source.file, './app/data', false, true, false, `${source.province}.csv`);
                await fsPromises.unlink(`${DATA_DIR}/${source.province}.zip`);
            }
        };

        let files = await fsPromises.readdir(DATA_DIR);
        files = files.filter(file => file.endsWith(('.csv')));
        const jsonWriter = fs.createWriteStream(`${DATA_DIR}/accounts.json`, {flags: 'a'});
        jsonWriter.write('{"accounts":[');
        for (const file of files) {
            const province = Path.parse(file).name;
            const csvStr = fs.createReadStream(`${DATA_DIR}/${file}`).pipe(parse({ delimiter: ",", from_line: 2}));
            for await (const row of csvStr) {
                const address = `${row[13]} ${row[14]} ${province}`
                .replace(/[-]/g, '')
                .replace(/ +/g, ' ');
                const obj = {
                    id: row[3],
                    name: uniqueNamesGenerator({ 
                        dictionaries: [names, names], 
                        style: 'capital',
                        length: 2,
                        separator: ' '
                    }),
                    address: address
                };
                jsonWriter.write(JSON.stringify(obj) + ',');
            }
        }
        jsonWriter.write(']}');
        jsonWriter.end();
    }

    /**
     * Creates the Redis search index for addresses
     * @param {*} client - Redis client
     */
    async #index(client) {
        try {
            await client.ft.dropIndex('addIdx');
        }
        catch (err) {};

        await client.ft.create('addIdx', {
            '$.address': {
                type: SchemaFieldTypes.TEXT,
                AS: 'address',
                SORTABLE: true
            }
        }, { ON: 'JSON', PREFIX: 'account:'});
    }

    /**
     * Inserts JSON docs into Redis.
     * @param {*} client - Redis client
     * @param {*} doc - JSON document containing address/account info
     */
    async #insert(client, doc) {
        await client.json.set(`account:${doc.id}`, '.', doc);

        const addr = doc.address;
        if (addr) {
            await client.ft.sugAdd(`fAdd`, addr, 1);
            await client.ft.sugAdd(`pAdd`, addr.substr(addr.indexOf(' ') + 1), 1);
        }
    }
}

(async () => {
    console.log('loader - data load started');
    const loader = new DataLoader();
    await loader.load();
    console.log('loader - data load complete');
})();