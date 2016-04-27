'use strict';

const mongoose = require('mongoose');
const express  = require('express');

const db = require('../lib/db');

const app = express();
const router = express.Router();

const core = require('../src/core');

const prefix = '/servers';

module.exports = (parent) => {
    app.disable('etag');
    app.disable('x-powered-by');
    app.set('trust proxy', parent.get('trust proxy'));

    core.logger.verbose('Init API:');
    core.logger.verbose(`\t\tGET ${prefix}`);
    router.get('/', (req, res, next) => {
        let limit = parseInt(req.query.limit) || core.defaultLimit;

        if (limit > core.globalLimit) {
            limit = core.globalLimit;
        }

        db.CCServerModel.find()
            .select('_id server_name ip status')
            .sort('server_name')
            .limit(limit)
            .exec((err, list) => {
                if (err) {
                    next(err);
                } else if (!list) {
                    next();
                } else {
                    res.json({ok: true, data: list});
                }
            });
    });

    router.param('id', (req, res, next, id) => {
        try {
            req.id = mongoose.Types.ObjectId(id);
            next();
        } catch (e) {
            e.apiError = 'invalid_id';
            next(e);
        }
    });

    core.logger.verbose(`\t\tGET ${prefix}/{id}`);
    router.get('/:id', (req, res, next) => {
        db.CCServerModel.findById(req.id, '_id dt server_name ip port status', (err, server) => {
            if (err) {
                next(err);
            } else if (!server) {
                next();
            } else {
                res.json({ok: true, data: server});
            }
        });
    });

    app.use(prefix, parent.authorize, router);
    parent.use(app);
};