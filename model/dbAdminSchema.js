const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: true,
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'admin',
    },
    permissions: {
        type: [String],
        default: [],
    },
    settings: {
        paymentMethods: {
            type: Map,
            of: Boolean,
            default: {
                paypal: true,
                stripe: true,
                creditCard: true,
            },
        },
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
