const mongoose = require("mongoose");
const Cart = require("../model/cartSchema");
const { Product } = require("../model/productSchema");

exports.getCart = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    console.log(cart);
    res.render("cart.ejs", { cart });
  } catch (error) {
    console.error("Error retrieving cart:", error);
    req.flash('error', 'Please try again.');
    // res.status(500).render("cart.ejs", {
    //   cart: null,
    //   error: "Error retrieving cart",
    // });
    res.redirect('/');
  }
};

exports.addToCart = async (req, res) => {
  // console.log(req.body);
  
  try {
    const userId = req.session.userId;
    const { productId, variantSize, variantColor, qty, variantImageUrls } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      req.flash('error', 'Invalid product ID');
      return res.redirect('/');
    }
    const product = await Product.findById(productId);
    console.log("product >>>>>>>>> ", product);
    
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/');
    }
    const selectedVariant = product.variants.find(
      (variant) => variant.size === variantSize && variant.color === variantColor
    );
    console.log("selectedVariant >>",selectedVariant);
    
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
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += parseInt(qty);
    } else {
      cart.items.push({
        product: productId,
        quantity: parseInt(qty),
        variant: {
          color: variantColor,
          size: variantSize,
          imageUrls: variantImageUrls ? variantImageUrls.split(',') : []
        },
        price: product?.price
        
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
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const userCart = await Cart.findOne({ user: userId });
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!userCart) {
      // return res.status(404).render("cart.ejs", { cartProducts: null, error: "Cart not found" });
      req.flash('error', 'Cart not found');
      return res.redirect('/');
    }
    userCart.items = userCart.items.filter((item) => {
      if (!item.product.equals(productId)) {
        return true;
      } else {
        return false;
      }
    });
    await userCart.save();
    res.redirect('/cart');
  } catch (error) {
    console.error("Error removing product from cart:", error);
    req.flash('error', 'Please try again.');
    res.redirect('/cart');
  }
};

exports.updateQuantity = async (req, res) => {
  try {
      const { productId, variantColor, variantSize, quantity } = req.body;
      const userId = req.session.userId;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.status(400).json({ success: false, message: 'Invalid product ID' });
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

      res.json({ success: true, message: 'Quantity updated successfully' });
  } catch (error) {
      console.error('Error updating quantity:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



