/**
 * @maker Joey Whelan
 * @fileoverview JS file containing the form action for the GUI.  Executes a REST API 
 * call to the Express server. In this case, the Search endpoint.
 */

'use strict';

function val(id) {
    return document.getElementById(id).value;
}

function hide(id) {
    id.innerHTML = '';
}

function search() {
    const address = val('addr');
    const url = `http://localhost:8000/address/search?address=${address}`
    fetch(url)
    .then(res => res.json())
    .then(data => {
        let results;
        if (data) {
            results = `Total matching accounts: ${data.total}<br><br>`;
            results += `First ${data.accounts.length} matching accounts:<br><br>`;
            for (const account of data.accounts) {
                results += `Account ID: ${account.id}<br>`
                results += `Name: ${account.name}<br>`
                results += `Address: ${account.address}<br><br>`
            }
        }
        else {
            results = 'No accounts found'
        }
        document.getElementById('results').innerHTML = results
    })
}

window.addEventListener('DOMContentLoaded', () => {
    hide(document.getElementById('results'));
});