'use strict';

const cluster = require('cluster');
let numCPUs = require('os').cpus().length;

const logger = require('./lib/logger');
const conf   = require('./lib/config');
const app = require('./app').app;

if (cluster.isMaster && conf.get('fork')) {

    while(numCPUs--) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.info(`Worker ${worker.process.pid} died. Code ${code}. Signal ${signal}.`);
    });
} else {
    app.listen(conf.get('port'), conf.get('ip'), () => {
        logger.info(`API server running at: ${conf.get('ip')}:${conf.get('port')}`);
    });
}