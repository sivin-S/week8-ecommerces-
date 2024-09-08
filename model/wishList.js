const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [wishlistItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

wishlistSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
