const mongoose = require('mongoose');


const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        // required: true
    },
    quantity: {
        type: Number,
        // required: true,
        min: 1
    },
    variant: {
        color: {
            type: String,
            // required: true,
            trim: true
        },
        size: {
            type: String,
            // required: true,
            trim: true
        }
    },
    price: {
        type: Number,
        // required: true,
        min: 0
    }
});


const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
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

// Pre-save hook to calculate total amount
cartSchema.pre('save', function(next) {
    if (this.isModified('items')) {
        this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    this.updatedAt = Date.now();
    next();
});


const checkoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
    },
    cart: cartSchema,  
    address: {
        username: String, 
        email: String, 
        state: String, 
        zip: Number, 
        phone: Number, 
        country: String, 
        landmark: String, 
        locality: String, 
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online', 'Wallet'],
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    transactionId: {
        type: String,
        trim: true
    },
    walletAmountUsed: {
        type: Number,
        default: 0
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    shippingCost: { 
        type: Number,
         default: 0 
        },
    totalPrice: {
         type: Number,
        //   required: true
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
checkoutSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Checkout = mongoose.model('Checkout', checkoutSchema);

module.exports = Checkout;
