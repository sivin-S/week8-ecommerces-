const mongoose = require('mongoose');


const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        // required: true
    },
    productName: {
        type: String,
        // required: true,
        trim: true
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
    canBeReturned: {
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
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
         default: 'Processing'
    },
   
  previousOrderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
    default: null
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

// Pre-save hook to update stock and handle status changes
checkoutSchema.pre('save', async function(next) {
    this.updatedAt = Date.now();

    if (this.isModified('orderStatus')) {
        const Product = mongoose.model('Product');

        for (const item of this.cart.items) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            const variant = product.variants.find(v => 
                v.color === item.variant.color && v.size === item.variant.size
            );
            if (!variant) continue;

            if (this.previousOrderStatus === 'Cancelled' && this.orderStatus === 'Processing') {
                // Decrease stock when changing from Cancelled to Processing
                variant.stock -= item.quantity;
            } else if (this.previousOrderStatus === 'Processing' && this.orderStatus === 'Cancelled') {
                // Increase stock when changing from Processing to Cancelled
                variant.stock += item.quantity;
            }

            await product.save();
        }

        this.previousOrderStatus = this.orderStatus;
    }

    next();
});

const Checkout = mongoose.model('Checkout', checkoutSchema);

module.exports = Checkout;
