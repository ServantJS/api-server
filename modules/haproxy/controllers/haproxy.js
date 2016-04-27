'use strict';

const mongoose = require('mongoose');
const express  = require('express');
const async    = require('async');

const db       = require('../../../lib/db');
const moduleDB = require('../db');

const app    = express();
const router = express.Router();

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

        moduleDB.HAProxyConfigModel.find()
            .select('content kind name order_num status target_id')
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
        let targetId = req.body.target;
        let name = req.body.name;
        let content = req.body.content;
        const kind = parseInt(req.body.kind);
        const order = parseInt(req.body.order_num);

        let e = null;

        if (!targetId) {
            e = new Error('Missing "target" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (!name) {
            e = new Error('Missing "name" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (!content) {
            e = new Error('Missing "content" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (isNaN(kind)) {
            e = new Error('Missing "kind" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        if (order && isNaN(parseInt(order))) {
            e = new Error('Missing "order_num" parameter"');
            e.apiError = 'missing_param';
            return next(e);
        }

        name = name.trim();
        content = content.trim();

        const id = mongoose.Types.ObjectId();
        const task = new db.TaskModel({
            _id: id,

            username: req.user.email,
            target_id: targetId,
            module: moduleName,
            cmd: 'create-config',

            params: JSON.stringify({name: name, content: content, kind: kind, order: order})
        });

        task.save((e) => {
            if (e) next(e);
            else res.json({ok: true, data: {task_id: id}});
        });
    });

    router.param('id', (req, res, next, id) => {
        try {
            req.paramModel = {};
            req.paramModel.id = mongoose.Types.ObjectId(id);

            moduleDB.HAProxyConfigModel.findById(req.paramModel.id, (err, config) => {
                if (err) {
                    next(err);
                } else if (!config) {
                    err = new Error(`HAProxy config "${req.paramModel.id}" not found`);
                    err.apiError = 'not_found';
                    next(err);
                } else {
                    req.paramModel.config = config;
                    next();
                }
            });
        } catch (e) {
            e.apiError = 'invalid_id';
            next(e);
        }
    });

    core.logger.verbose(`\t\tGET ${prefix}/{id}`);
    router.get('/:id', (req, res, next) => {
        res.json({ok: true, data: {
            name: req.paramModel.config.name,
            content: req.paramModel.config.content,
            order_num: req.paramModel.config.order_num,
            kind: req.paramModel.config.kind,
            status: req.paramModel.config.status,
            target_id: req.paramModel.config.target_id
        }});
    });

    core.logger.verbose(`\t\tPUT ${prefix}/{id}`);
    router.put('/:id', (req, res, next) => {
        try {
            const name = req.body.name;
            const content = req.body.content;
            const order = parseInt(req.body.order_num);

            let params = {id: req.paramModel.id};

            if (name && name.length) {
                params.name = name.trim();
            }

            if (content && content.length) {
                params.content = content.trim();
            }

            if (order && !isNaN(parseInt(order))) {
                params.order_number = order;
            }

            const id = mongoose.Types.ObjectId();
            const task = new db.TaskModel({
                _id: id,

                username: req.user.email,
                target_id: req.paramModel.config.target_id,
                module: moduleName,
                cmd: 'update-config',

                params: JSON.stringify(params)
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
            target_id: req.paramModel.config.target_id,
            module: moduleName,
            cmd: 'remove-config',

            params: JSON.stringify({id: req.paramModel.id})
        });

        task.save((e) => {
            if (e) next(e);
            else res.json({ok: true, data: {task_id: id}});
        });
    });

    app.use(prefix, parent.authorize, router);
    parent.use(app);
};