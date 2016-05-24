'use strict';

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const WorkerSchema = exports.WorkerSchema = new Schema({
    server_id: {type: Schema.Types.ObjectId, ref: 'Server'},
    sys_id: {type: String, index: true, unique: true},
    dt: Date,
    server_name: {type: String, unique: true},
    ip: String,
    status: Number,
    message: String,
    modules: [String]
});

mongoose.model('Worker', WorkerSchema);