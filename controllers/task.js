'use strict';

const mongoose = require('mongoose');
const express  = require('express');

const db = require('../lib/db');

const app = express();
const router = express.Router();

const core = require('../src/core');

const prefix = '/tasks';

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

        db.TaskModel.find({})
            .select('dt username module cmd status')
            .sort('dt')
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
        db.TaskModel.findById(req.id, 'dt target_id server_id username status module cmd params internal_error report error', (err, task) => {
            if (err) {
                next(err);
            } else if (!task) {
                next();
            } else {
                res.json({ok: true, data: task});
            }
        });
    });

    app.use(prefix, parent.authorize, router);
    parent.use(app);
};