'use strict';

const mongoose = require('mongoose');
const express = require('express');
const async = require('async');

const db = require('../lib/db');

const app = express();
const router = express.Router();

const core = require('../src/core');

const prefix = '/workers-groups';

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

        db.WorkersGroupModel.find({})
            .select('name sys_id server_id workers')
            .populate('server_id', '_id server_name ip status')
            .populate('workers', '_id server_name ip status')
            .sort('name')
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

    core.logger.verbose(`\t\tPOST ${prefix}`);
    router.post('/', (req, res, next) => {
        let name = req.body.name;
        let serverId = req.body.server_id;
        let workers = req.body.workers;

        let e = null;

        if (!name) {
            e = new Error('Missing "name" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (!serverId) {
            e = new Error('Missing "server_id" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (!workers) {
            e = new Error('Missing "workers" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (!Array.isArray(workers)) {
            e = new Error('Parameters "workers" must be an array of string"');
            e.apiError = 'invalid_param';
            return next(e);
        }

        name = name.trim();
        serverId = serverId.trim();

        try {
            serverId = mongoose.Types.ObjectId(serverId);
            workers = workers.map((item) => mongoose.Types.ObjectId(item));
        } catch (e) {
            e.apiError = 'invalid_param';
            return next(e);
        }

        //TODO check serverId exists
        //TODO check each worker exists

        const model = new db.WorkersGroupModel({
            name: name,
            server_id: mongoose.Types.ObjectId(serverId),
            workers: workers
        });

        model.save((e) => {
            if (e) {
                next(e);
            } else {
                res.json({ok: true, data: {id: model.sys_id}});
            }
        });
    });

    router.param('id', (req, res, next, id) => {
        try {
            req.paramModel = {};
            req.paramModel.id = mongoose.Types.ObjectId(id);

            if (req.method == 'PUT' || req.method == 'DELETE') {
                db.WorkersGroupModel.findById(req.paramModel.id, (err, group) => {
                    if (err) {
                        next(err);
                    } else if (!group) {
                        err = new Error(`Group "${req.paramModel.id}" not found`);
                        err.apiError = 'not_found';
                        next(err);
                    } else {
                        req.paramModel.group = group;
                        next();
                    }
                });
            } else {
                next();
            }
        } catch (e) {
            e.apiError = 'invalid_id';
            next(e);
        }
    });

    core.logger.verbose(`\t\tGET ${prefix}/{id}`);
    router.get('/:id', (req, res, next) => {
        db.WorkersGroupModel.findById(req.paramModel.id)
            .populate('server_id', '_id server_name ip status')
            .populate('workers', '_id server_name ip status')
            .select('name sys_id server_id workers').exec((err, group) => {
            if (err) {
                next(err);
            } else if (!group) {
                next();
            } else {
                res.json({ok: true, data: group});
            }
        });
    });

    core.logger.verbose(`\t\tPUT ${prefix}/{id}`);
    router.put('/:id', (req, res, next) => {
        let name = req.body.name;
        let serverId = req.body.server_id;
        let workers = req.body.workers;

        try {
            if (name && name.length) {
                req.group.name = name.trim();
            }

            if (serverId && serverId.length) {
                req.group.server_id = mongoose.Types.ObjectId(serverId.trim());
            }

            if (workers && workers.length) {
                req.group.workers = workers.map((item) => mongoose.Types.ObjectId(item.trim()));
            }

            req.paramModel.group.save((e) => {
                if (e) {
                    next(e);
                } else {
                    res.json({ok: true});
                }
            });
        } catch (e) {
            next(e);
        }
    });

    core.logger.verbose(`\t\tDELETE ${prefix}/{id}`);
    router.delete('/:id', (req, res, next) => {
        req.paramModel.group.remove((e) => {
            if (e) {
                next(e);
            } else {
                res.json({ok: true});
            }
        });
    });

    app.use(prefix, parent.authorize, router);
    parent.use(app);
};