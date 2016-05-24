'use strict';

const mongoose = require('mongoose');
const express  = require('express');
const async    = require('async');
const util     = require('util');

const db       = require('../../../lib/db');
const moduleDB = require('../db');

const app    = express();
const router = express.Router();

const checkIdOnRequest = require('../../common').checkIdOnRequest;

const core = require('../../../src/core');

const moduleName = 'haproxy';
const prefix = '/haproxy-configs';

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

        moduleDB.HAProxyConfigModel.find({})
            .select('_id container target_id')
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
        try {
            let targetId = req.body.target;
            let configs = req.body.configs;

            if (!targetId) {
                const e = new Error('Missing "target" parameter"');
                e.apiError = 'missing_param';
                return next(e);
            }

            if (!configs) {
                const e = new Error('Missing "configs" parameter"');
                e.apiError = 'missing_param';
                return next(e);
            }

            if (!Array.isArray(configs)) {
                const e = new Error('"configs" must be an array of objects"');
                e.apiError = 'wrong_param';
                return next(e);
            }

            const id = mongoose.Types.ObjectId();
            const task = new db.TaskModel({
                _id: id,

                username: req.user.email,
                target_id: targetId,
                module: moduleName,
                cmd: 'create-config',

                params: JSON.stringify({container: configs})
            });

            task.save((err) => {
                if (err) next(err);
                else res.json({ok: true, data: {task_id: id}});
            });
        } catch (e) {
            next(e);
        }
    });

    router.param('id', checkIdOnRequest({
        model: moduleDB.HAProxyConfigModel
    }));

    core.logger.verbose(`\t\tGET ${prefix}/{id}`);
    router.get('/:id', (req, res, next) => {
        res.json({ok: true, data: {
            target_id: req.currentModel.target_id,
            container: req.currentModel.container
        }});
    });

    core.logger.verbose(`\t\tPUT ${prefix}/{id}`);
    router.put('/:id', (req, res, next) => {
        try {
            let configs = req.body.configs;

            if (!configs) {
                const e = new Error('Missing "configs" parameter"');
                e.apiError = 'missing_param';
                return next(e);
            }

            if (!Array.isArray(configs)) {
                const e = new Error('"configs" must be an array of objects"');
                e.apiError = 'wrong_param';
                return next(e);
            }

            const data = {
                id: req.currentModel._id,
                container: configs
            };

            const id = mongoose.Types.ObjectId();
            const task = new db.TaskModel({
                _id: id,

                username: req.user.email,
                target_id: req.currentModel.target_id,
                module: moduleName,
                cmd: 'update-config',

                params: JSON.stringify(data)
            });

            task.save((e) => {
                if (e) next(e);
                else res.json({ok: true, data: {task_id: id}});
            });
        } catch (e) {
            next(e);
        }
    });

    core.logger.verbose(`\t\tDELETE ${prefix}/{id}`);
    router.delete('/:id', (req, res, next) => {
        const id = mongoose.Types.ObjectId();
        const task = new db.TaskModel({
            _id: id,

            username: req.user.email,
            target_id: req.currentModel.target_id,
            module: moduleName,
            cmd: 'remove-config',

            params: JSON.stringify({id: req.currentModel._id})
        });

        task.save((e) => {
            if (e) next(e);
            else res.json({ok: true, data: {task_id: id}});
        });
    });

    core.logger.verbose(`\t\tPUT ${prefix}/{id}/append`);
    router.put('/:id/append', (req, res, next) => {
        try {
            let config = req.body.config;

            if (!config) {
                const e = new Error('Missing "config" parameter"');
                e.apiError = 'missing_param';
                return next(e);
            }

            if (!util.isObject(config)) {
                const e = new Error('"configs" must be an objects"');
                e.apiError = 'wrong_param';
                return next(e);
            }

            req.currentModel.container.push(config);

            const data = {
                id: req.currentModel._id,
                container: req.currentModel.container
            };

            const id = mongoose.Types.ObjectId();
            const task = new db.TaskModel({
                _id: id,

                username: req.user.email,
                target_id: req.currentModel.target_id,
                module: moduleName,
                cmd: 'update-config',

                params: JSON.stringify(data)
            });

            task.save((e) => {
                if (e) next(e);
                else res.json({ok: true, data: {task_id: id}});
            });
        } catch (e) {
            next(e);
        }
    });

    core.logger.verbose(`\t\tDELETE ${prefix}/{id}/removeBy`);
    router.delete('/:id/removeBy', (req, res, next) => {
        try {
            let name = req.body.name;
            let index = parseInt(req.body.index);

            if (name && name.length) {
                req.currentModel.container = req.currentModel.container.filter((item) => item.name !== name);
            } else if (index && util.isNumber(index)) {
                req.currentModel.container.splice(index, 1);
            } else {
                const e = new Error('Missing params "name" or "index"');
                e.apiError = 'missing_param';
                return next(e);
            }

            const data = {
                id: req.currentModel._id,
                container: req.currentModel.container
            };

            const id = mongoose.Types.ObjectId();
            const task = new db.TaskModel({
                _id: id,

                username: req.user.email,
                target_id: req.currentModel.target_id,
                module: moduleName,
                cmd: 'update-config',

                params: JSON.stringify(data)
            });

            task.save((e) => {
                if (e) next(e);
                else res.json({ok: true, data: {task_id: id}});
            });
        } catch (e) {
            next(e);
        }
    });

    app.use(prefix, parent.authorize, router);
    parent.use(app);
};