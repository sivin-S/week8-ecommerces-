const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
},
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
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

categoryOfferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

categoryOfferSchema.pre('find', function(next) {
  this.where({ endDate: { $gt: new Date() } });
  next();
});

const CategoryOffer = mongoose.model('CategoryOffer', categoryOfferSchema);

module.exports = CategoryOffer;