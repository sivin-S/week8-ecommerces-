const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
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
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    imageUrls: {
        type: [String],
        default: []
        // required: true
    },
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true,
        trim: true
    },
    brand:{
        type: String,
        trim: true
    },
    description: {
        type: String,
        // required: true,
        trim: true
    },
    price: {
        type: Number,
        // required: true,
        min: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        // required: true,
        trim: true
    },
    gender: {
        type: String,
        // required: true,
        enum: ['mens', 'womens'],
        trim: true
    },
    deleted: {
        type: Boolean,  //soft delete product
        default: false
    },
    variants: [variantSchema],
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
});

productSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Product = mongoose.model('Product', productSchema);
const Variant = mongoose.model('Variant', variantSchema);

module.exports = {
    Product,
    Variant
};
