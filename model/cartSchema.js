const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        // required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    variant: {
        color: {
            type: String,
            required: true,
            trim: true
        },
        size: {
            type: String,
            required: true,
            trim: true
        },
        imageUrls: {
            type: [String],
            required: true
        }
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        default: 0
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

cartSchema.pre('save', function(next) {
    this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    next();
});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;


