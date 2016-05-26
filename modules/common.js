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

exports.isStringParam = (body, param) => {
    return body.hasOwnProperty(param) && typeof body[param] === 'string' && body[param].trim().length;
};

exports.isNumberParam = (body, param) => {
    return body.hasOwnProperty(param) && !isNaN(parseInt(body[param], 10));
};

exports.isArrayParam = (body, param) => {
    return body.hasOwnProperty(param) && Array.isArray(body[param]);
};

exports.isNotEmptyArrayParam = (body, param) => {
    return body.hasOwnProperty(param) && Array.isArray(body[param]) && body[param].length;
};