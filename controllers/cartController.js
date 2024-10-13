const mongoose = require("mongoose");
const Cart = require("../model/cartSchema");
const { Product } = require("../model/productSchema");


exports.getCart = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    let cart = await Cart.findOne({ user: userId }).populate("items.product");
   
    let quantityUpdated = false;
    let itemsToRemove = [];
    let priceUpdated = false;

   
    for (let item of cart.items) {
      const product = await Product.findById(item.product._id);
      const variant = product.variants.find(v => v.size === item.variant.size && v.color === item.variant.color);
      
      if (variant) {
        if (variant.stock === 0) {
          itemsToRemove.push(item._id);
          quantityUpdated = true;
        } else if (item.quantity > variant.stock) {
          item.quantity = variant.stock;
          quantityUpdated = true;
        }


        const currentPrice = product.discountedPrice && product.discountedPrice < product.price
        ? product.discountedPrice
        : product.price;

        if (item.price !== currentPrice) {
          item.price = currentPrice;
          priceUpdated = true;
        }




      }
    }
    
    if (quantityUpdated || priceUpdated) {
      // Remove items with zero stock
      cart.items = cart.items.filter(item => !itemsToRemove.includes(item._id));
      
      await cart.save();
      if (quantityUpdated) {
        req.flash('warning', 'Some item quantities have been updated due to stock changes.');
      }
      if (priceUpdated) {
        req.flash('info', 'Some item prices have been updated.');
      }
    }

    res.render("cart.ejs", { cart });
  } catch (error) {
    console.error("Error retrieving cart:", error);
    req.flash('error', 'An error occurred while retrieving your cart. Please try again.');
    res.redirect('/');
  }
};

exports.addToCart = async (req, res) => {
  console.log("addToCart >>>>>>>>>>>>>>>>>>>>>>>> ", req.body);

  try {
    const userId = req.session.userId;
    const { productId, productName, variantSize, variantColor, qty, variantImageUrls } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      req.flash('error', 'Invalid product ID');
      return res.redirect('/');
    }

    const product = await Product.findById(productId);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/');
    }

    const selectedVariant = product.variants.find(
      (variant) => variant.size === variantSize && variant.color === variantColor
    );

    if (!selectedVariant) {
      req.flash('error', 'Selected variant not available');
      return res.redirect('/');
    }

    if (selectedVariant.stock < qty) {
      req.flash('error', 'Not enough stock available');
      return res.redirect('/');
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant.size === variantSize &&
        item.variant.color === variantColor
    );

    const priceToUse = product.discountedPrice && product.discountedPrice < product.price
      ? product.discountedPrice
      : product.price;

    if (existingItemIndex > -1) {
      const existingItem = cart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + parseInt(qty);

      if (newQuantity > selectedVariant.stock) {
        req.flash('error', `Only ${selectedVariant?.stock} items available in stock`);

        return res.redirect('/cart');
      }

      existingItem.quantity = newQuantity;
      existingItem.price = priceToUse; 
    } else {
      if (parseInt(qty) > selectedVariant?.stock) {
        req.flash('error', `Only ${selectedVariant?.stock} items available in stock`);

        return res.redirect('/cart');
      }

      const priceToUse = product.discountedPrice && product.discountedPrice < product.price
      ? product.discountedPrice
      : product.price;


      cart.items.push({
        product: productId,
        productName: productName,
        quantity: parseInt(qty),
        variant: {
          color: variantColor,
          size: variantSize,
          imageUrls: variantImageUrls ? variantImageUrls.split(',') : []
        },
        price: priceToUse
      });
    }

    await cart.save();
    req.flash('success', 'Product added to cart');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error adding to cart:', error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/');
  }
};





exports.removeProductFromCart = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const itemIndex = parseInt(req.body.index, 10);

    const userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      return res.json({ success: false, message: 'Cart not found' });
    }

    if (itemIndex >= 0 && itemIndex < userCart.items.length) {
      userCart.items.splice(itemIndex, 1); 
      await userCart.save();
      return res.json({ success: true, message: 'Item removed from cart' });
    } else {
      return res.json({ success: false, message: 'Invalid item index' });
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    return res.json({ success: false, message: 'Please try again.' });
  }
};



exports.updateQuantity = async (req, res) => {
  console.log("updateQuantity >>>>>>>>>>>>>>>>>>>>>>>> ", req.body);
  try {
      const { productId, variantColor, variantSize, quantity } = req.body;
      const userId = req.session.userId;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.status(400).json({ success: false, message: 'Invalid product ID' });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      const selectedVariant = product.variants.find(
        (variant) => variant.size === variantSize && variant.color === variantColor
      );
  
      if (!selectedVariant) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
      }
  
      if (quantity > selectedVariant.stock) {
        return res.status(400).json({ success: false, message: `Only ${selectedVariant.stock} items available in stock` });
      }








      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
          return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      const item = cart.items.find(
          (item) =>
              item.product.toString() === productId &&
              item.variant.color === variantColor &&
              item.variant.size === variantSize
      );

      if (!item) {
          return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }

      item.quantity = quantity;
      await cart.save();

      res.json({ success: true, message: 'Quantity updated successfully', newStock: selectedVariant.stock });
    } catch (error) {
      console.error('Error updating quantity:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



