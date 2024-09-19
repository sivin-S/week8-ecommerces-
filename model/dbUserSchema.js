const mongoose = require('mongoose');
const Address = require('./addressSchema'); 

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    isAdmin:{
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        // required: true
    },
    gender: {
        type: String,
        // required: true
    },
    age: {
        type: Number,
        // required: true
    },
    passwordChangedAt: {
        type: Date,
    },
    totalPasswordChanges: {
        type: Number,
    },
    wallet: {
        balance: {
            type: Number,
            default: 0
        },
        transactions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction'
        }]
    },
    paymentMethods: [{
        type: {
            type: String,
            enum: ['Credit Card', 'Debit Card']
        },
        details: {
            cardNumber: String,
            cardHolderName: String,
            expiryDate: String,
            cvv: String
        }
    }],
    orderHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    addresses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        enum: ['customer', 'guest'],
        default: 'customer'
    },
    isadmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    googleId: {
        type: String,
        sparse: true
    }
});

// Pre-save hook to update the updatedAt field
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
