const mongoose = require('mongoose');

const dailyMessageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('dailyMessage', dailyMessageSchema);