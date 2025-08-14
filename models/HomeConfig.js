const mongoose = require('mongoose');

const homeConfigSchema = new mongoose.Schema({

    category: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    }


})

module.exports = mongoose.model('HomeConfig', homeConfigSchema);