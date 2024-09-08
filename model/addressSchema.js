const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    phone: { 
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    locality: { 
        type: String,
        required: true,
        trim: true
    },
    landmark: { 
        type: String,
        required: true,
        trim: true
    },
    zip: { 
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to update the updatedAt field
addressSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
