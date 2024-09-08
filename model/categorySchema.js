const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['mens', 'womens'],
        trim: true
    },
    productCount: {
        type: Number,
        default: 0
    },
    deleted:{
      type: Boolean, // soft delete
      default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Pre-save middleware to update the updatedAt field
categorySchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Pre-update middleware to update the updatedAt field
categorySchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
