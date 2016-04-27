'use strict';

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const crypto = require('crypto');

function generateId(pref) {
    const currentDate = (new Date()).valueOf().toString();
    const random = Math.random().toString();
    return (pref + crypto.createHash('md5').update(currentDate + random).digest('hex')).toUpperCase();
}

const WorkersGroupSchema = exports.WorkersGroupSchema = new Schema({
    name: String,
    sys_id: {type: String, index: true, unique: true},
    server_id: {type: Schema.Types.ObjectId, ref: 'CCServer'},
    workers: [{type: Schema.Types.ObjectId, ref: 'Worker'}]
});

WorkersGroupSchema.pre('save', function (next) {
    if (!this.sys_id) {
        this.sys_id = generateId('g');
    }

    next();
});

mongoose.model('WorkersGroup', WorkersGroupSchema);