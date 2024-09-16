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
  console.log(req.body);
  
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

exports.updateCart = async (req, res) => {
  try {
    const quantity = parseInt(req.body.qty, 10);
    const totalAmount = parseFloat(req.body.totalAmount);
    if (isNaN(quantity) || isNaN(totalAmount)) {
      // return res.status(400).json({ error: 'Invalid quantity or total amount' });
      console.log('Invalid quantity or total amount');
      
      req.flash('error', 'Please try again.');
      return res.redirect('/cart');
    }
    let updatedQuantities;
   
    // console.log("updatedQuantities", req.body);
    if (req.body.updatedQuantities && req.body.updatedQuantities !== '') {
      try {
        updatedQuantities = JSON.parse(req.body.updatedQuantities);
      } catch (error) {
        console.error('Error parsing updatedQuantities:', error);
        req.flash('error', 'Please try again.');
        // return res.status(400).json({ error: 'Invalid updated quantities format' });
        return res.redirect('/cart');
      }
    }
    const cart = await Cart.findOne({ user: req.session.userId });
    if (!cart) {
      req.flash('error', 'Cart not found');
      return res.redirect('/cart');
    }
    if (updatedQuantities) {
      updatedQuantities.forEach((itemUpdate) => {
        const item = cart.items.find(i => i.product.equals(itemUpdate.productId));
        if (item) {
          item.quantity = itemUpdate.quantity;
        }
      });
    }
    cart.totalAmount = totalAmount;
    await cart.save();
    res.redirect('/checkout');
  } catch (error) {
    console.error('Error updating cart:', error);
    // res.status(500).json({ error: 'Internal server error' });
    req.flash('error', 'Internal Server Error');
    res.redirect('/');
  }
};


