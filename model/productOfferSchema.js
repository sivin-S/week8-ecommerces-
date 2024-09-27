const mongoose = require('mongoose');

const productOfferSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  offerPercentage: {
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


productOfferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const ProductOffer = mongoose.model('ProductOffer', productOfferSchema);

module.exports = ProductOffer;