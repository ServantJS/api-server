'use strict';

const mongoose = require('mongoose');

/** @namespace req.currentModel */

exports.checkIdOnRequest = (options) => {

    return (req, res, next, id) => {
        try {
            options.model.findById(mongoose.Types.ObjectId(id), (err, model) => {
                if (err) {
                    next(err);
                } else if (!model) {
                    err = new Error(`${id} not found`);
                    err.apiError = 'not_found';
                    next(err);
                } else {
                    req[options.current || 'currentModel'] = model;
                    next();
                }
            });
        } catch (e) {
            next(e);
        }
    }

};