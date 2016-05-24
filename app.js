'use strict';

const mongoose = require('mongoose');
const express  = require('express');
const cluster  = require('cluster');
const fs       = require('fs');
const path     = require('path');

const bodyParser = require('body-parser');
const morgan     = require('morgan');

const logger = require('./lib/logger');
const conf   = require('./lib/config');

logger.verbose('Init. Options:', conf.get());

const db = require('./lib/db');

db.connect((err) => {
    if (err) {
        throw err;
    }

    logger.info('Successful connected to DB: ' + conf.get('db').url)
});

const app = express();

app.disable('x-powered-by');
app.disable('etag');

if (conf.get('env') == 'production') {
    const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs', 'server.access.log'), {flags: 'a'});
    app.use(morgan('common', {stream: accessLogStream}));
} else {
    if (conf.get('fork')) {
        morgan.token('process-id', (req) => {
            return process.pid
        });

        app.use(morgan('[:process-id] :method :url :status :response-time ms - :res[content-length]'));
    } else {
        app.use(morgan('dev'));
    }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

if (app.get('env') === 'production') {
    app.set('trust proxy', 1); // trust first proxy
}

app.authorize = (req, res, next) => {
    const accessToken =  req.get('X-SJS-AccessToken');

    if (!accessToken) {
        const e = new Error('Missing auth token header');
        e.apiError = 'missing_token';
        return next(e);
    }

    db.UserModel.findOne({access_key: accessToken.toUpperCase()}, (err, user) => {
        if (err) {
            next(err);
        } else if (!user) {
            err = new Error('Invalid access token');
            err.apiError = 'invalid_token';
            next(err);
        } else {
            req.user = user;
            next();
        }
    });
};

// load main controllers
fs.readdirSync(path.join(__dirname, 'controllers')).forEach((name) => {
    logger.verbose(`Load core controller: ${name}`);
    require(path.join(__dirname, 'controllers', name))(app);
});

//load modules url handlers
fs.readdirSync(path.join(__dirname, 'modules')).forEach((name) => {
    logger.verbose(`Load module: ${name}`);

    if (!name.endsWith('.js')) {
        require(path.join(__dirname, 'modules', name))(app);
    }
});

// handle error
app.use((err, req, res, next) => {
    if (err.hasOwnProperty('apiError')) {
        res.json({ok: false, error: err.apiError, msg: err.message});
    } else {
        res.json({ok: false, error: 'server_error', msg: 'Server error'});
    }

    logger.error(err.message);
    logger.verbose(err.stack);
});

//handle not found error
app.use((req, res, next) => {
    res.json({ok: false, error: 'not_found', msg: 'Not Found'});
});

(new db.UserModel({
    email: conf.get('root_account').email,
    pwd: conf.get('root_account').pwd
})).save((e) => {});

exports.app = app;