const mongoose = require('mongoose');


const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    offerPrice: {
        type: Number,
        required: true,
        min: 0
    },
    minPurchaseAmount: {
        type: Number,
        required: true,
        min: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean, 
        default: true
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

couponSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;