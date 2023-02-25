# Redis Address Autocomplete

## Blog
https://joeywhelan.blogspot.com/2023/02/autocomplete-with-redis-search.html

## Contents
1.  [Summary](#summary)
2.  [Architecture](#architecture)
3.  [Features](#features)
4.  [Prerequisites](#prerequisites)
5.  [Installation](#installation)
6.  [Usage](#usage)


## Summary <a name="summary"></a>
This is a Javascript-based demo of the Redis Search + Suggest functionality.  Address data is obtained from a Canadian government website.  Two data sets (Prince Edward Island and Northwest Territories) are inserted into Redis as JSON documents.  They are indexed by address and two suggestion dictionaries are built:  one with full address info (to include street number), the other with just street names.

## Architecture <a name="architecture"></a>
![architecture](https://docs.google.com/drawings/d/e/2PACX-1vTWH3wJZf-K8qg9XJn4b3mhXdlm3TE031t5YSMTQ4r9zCHTihOrdttqHTUijC-7u2cM-2Gto0JxPoYz/pub?w=663&h=380)  

## Features <a name="features"></a>
- ExpressJS-based REST API server, data loading functionality, and HTML GUI to demonstrate address autocomplete.

## Prerequisites <a name="prerequisites"></a>
- Docker
- Docker Compose

## Installation <a name="installation"></a>
```bash
git clone https://github.com/Redislabs-Solution-Architects/address-ac.git && cd address-ac
```

## Usage <a name="usage"></a>
### Server start-up
```bash
docker compose up -d
```
### Server shutdown
```bash
docker compose down
```
### GUI Access
```bash
http://localhost:8000
```



