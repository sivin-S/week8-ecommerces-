// userController.js
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../model/dbUserSchema");
const Address = require("../model/addressSchema");
const Wishlist = require("../model/wishList");
const Checkout = require("../model/checkoutSchema");
const Cart = require("../model/cartSchema");
const { Product } = require("../model/productSchema");

exports.getProfile = async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.session.email }).populate('addresses');
        // console.log("userData >>>", userData);
        if (!userData) {
            return res.status(404).send("User not found");
        }
        res.render("profile.ejs", { userData });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("Error fetching user data");
    }
};

exports.deleteAddress = async (req, res) => {
    console.log("delete address >> ", req.body);
    try {
        const userId = req.session.userId;
        const { addressId } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { addresses: addressId } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const deletedAddress = await Address.findByIdAndDelete(addressId);

        if (!deletedAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Error deleting address. Please try again." });
    }
};


exports.updateProfile = async (req, res) => {
    console.log(req.body);
    try {
        const userId = req.session.userId;
        const { username, age, gender } = req.body;

      
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { username, age, gender } },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "Error updating profile. Please try again." });
    }
};





exports.editAddress = async (req, res) => {
    console.log("edit address >> ",req.body);
    try {
        const userId = req.session.userId;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            req.flash('error', "Invalid user ID");
            return res.redirect("/profile");
        }

        const { index, username,  phone, zip, locality, state, country, landmark } = req.body;

        if (index !== '' && (isNaN(index) || index < 0)) {
            req.flash('error', "Invalid address index");
            return res.redirect("/profile");
        }

        const user = await User.findById(userId).populate('addresses');
        if (!user) {
            return res.status(404).send("User not found");
        }

        const newAddressData = {username,  phone, zip, locality, state, country, landmark };

        if (index === '') {
            const newAddress = new Address(newAddressData);
            await newAddress.save();
            user.addresses.push(newAddress._id);
        } else {
            const addressIndex = parseInt(index, 10);
            if (addressIndex >= user.addresses.length) {
                req.flash('error', "Address index out of bounds");
                return res.redirect("/profile");
            }
            const addressId = user.addresses[addressIndex];
           const result = await Address.findByIdAndUpdate(addressId, { $set: newAddressData });
            if (result) {
                req.flash('success', "Address edited successfully");
                res.redirect("/profile");
            } else {
                req.flash('error', "Try again editing address");
                res.redirect("/profile");
            }
        }

       
      
    } catch (error) {
        console.error("Error updating address:", error);
        req.flash('error', "Try again editing address");
        res.redirect("/profile");
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.session.email });
        if (user && (await bcrypt.compare(req.body.currentPassword, user.password))) {
            const hashedPassword = await bcrypt.hash(req.body.confirmPassword, 10);
            const updateResult = await User.updateOne(
                { email: req.session.email },
                {
                    $set: {
                        password: hashedPassword,
                        passwordChangedAt: Date.now(),
                        totalPasswordChanges: user.totalPasswordChanges + 1 || 1
                    }
                }
            );
            if (updateResult.modifiedCount > 0) {
                req.flash('success', 'Password Changed 👍');
                req.session.destroy();
                res.redirect('/profile');
            } else {
                req.flash('error', 'Failed to update password');
                res.redirect('/profile');
            }
        } else {
            req.flash('error', 'Invalid password');
            res.redirect('/profile');
        }
    } catch (error) {
        console.error("Error resetting password:", error);
        req.flash('error', "Try again resetting password");
        res.redirect('/profile');
    }
};

exports.getWishlist = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.session.userId);
        const products = await Wishlist.findOne({ user: userId }).populate("items.product");
        res.render("wishList.ejs", { products });
    } catch (error) {
        console.error("Error retrieving wishlist:", error);
        res.redirect("/wishlist");
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const userId = req.session.userId;
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, items: [] });
        }

        const existingItemIndex = wishlist.items.findIndex(
            (item) => item.product.toString() === product._id.toString()
        );
        if (existingItemIndex === -1) {
            wishlist.items.push({ product: product._id });
        }

        await wishlist.save();
        res.redirect("/wishlist");
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.redirect("/");
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId } = req.body;

        await Wishlist.updateOne(
            { user: userId },
            { $pull: { items: { product: productId } } }
        );

        res.redirect("/wishlist");
    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.redirect("/wishlist");
    }
};

exports.getOrderHistory = async (req, res) => {
    try {
        const checkOut = await Checkout.find({})
            .populate('user')
            .populate('address')
            .populate({
                path: 'cart.items.product',
                model: 'Product'  
            });

        // console.log("checkOut >>>>>>>>>>>>>>>>>>>>>");
    //    console.log(checkOut);
       
       
        res.render("orderHistory.ejs", { checkOut });
    } catch (err) {
        console.log(err);
        res.redirect("/orderhistory");
    }
};

exports.getOrderOneHistory = async(req,res)=>{
   try{
    const  checkout = await Checkout.findById(req.params.id)
              .populate('user')
              .populate('address')
              .populate({
                path: 'cart.items.product',
                model: 'Product'
              })
    
    // console.log("checkout >>>>>>>>>>>");
    // console.log(checkout);
    
    res.render('checkOutDetails.ejs',{checkout})

   }catch(err){
      console.log(err);
      res.redirect("/orderhistory")
   }
}


exports.getOrderCancel = async (req, res) => {
    try {
        const orderId = req.params.id;
        const updatedCheckout = await Checkout.findByIdAndUpdate(
            orderId,
            { $set: { orderStatus: 'Cancelled' } },
            { new: true }
        ).populate('cart.items.product');

        if (!updatedCheckout) {
            return res.status(404).send('Order not found');
        }

        for (const item of updatedCheckout.cart.items) {
            await Product.findOneAndUpdate(
                { 
                    _id: item.product._id, 
                    'variants.color': item.variant.color, 
                    'variants.size': item.variant.size 
                },
                { $inc: { 'variants.$.stock': item.quantity } }
            );
        }

        // console.log('Updated order:', updatedCheckout);
        res.redirect('/orderhistory');
    } catch (err) {
        console.log(err);
        res.redirect('/orderhistory');
    }
};



exports.getCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.find({ _id: userId }).populate('addresses');
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before proceeding to checkout.');
            return res.redirect('/cart');
        }

        console.log("User:", user);
        console.log("Cart:", cart);

        res.render("checkout.ejs", { user, cart: [cart] });
    } catch (err) {
        console.error("Error in getCheckout:", err);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect("/cart");
    }
};

exports.checkout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { address: addressId, paymentMethod, shippingCost } = req.body;
        const addressObject = await Address.findById(addressId);
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!addressObject) {
            req.flash('error', 'Address not found');
            return res.redirect('/cart');
        }

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }

        // Check stock for each item in the cart
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            const variant = product.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
            
            if (!variant || variant.stock < item.quantity) {
                req.flash('error', `Not enough stock for ${product.name} (${item.variant.color}, ${item.variant.size})`);
                return res.redirect('/cart');
            }
        }

        // If stock check passes, proceed with order creation and stock update
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            const variant = product.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
            
            variant.stock -= item.quantity;
            await product.save();
        }

        const totalPrice = cart.totalAmount + parseFloat(shippingCost || 0);

        const checkout = new Checkout({
            user: userId,
            cart: cart,
            address: addressObject,
            paymentMethod: paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Processing',
            shippingCost: parseFloat(shippingCost || 0),
            totalPrice: totalPrice
        });

        await checkout.save();

        // Clear the cart after successful checkout
        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [], totalAmount: 0 } });

        req.flash('success', 'Checkout successful');
        res.render('paymentComplete.ejs');
    } catch (error) {
        console.error('Checkout error:', error);
        req.flash('error', 'An error occurred during checkout');
        res.redirect('/cart');
    }
};

exports.loginUserPage = (req, res)=> {
    if (req.session.userStatus) {
        res.redirect("/");
    } else {
        res.setHeader('Cache-Control', 'no-store');
        res.render('login.ejs');
    }
}







exports.addToCartFromWishlist = async (req, res) => {
    try {
        const { productId, variantSize, variantColor, qty } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).render("cart.ejs", { product: null, error: "Product not found" });
        }

        const selectedVariant = product.variants.find(
            (variant) => variant.size === variantSize && variant.color === variantColor
        );

        if (!selectedVariant) {
            return res.status(400).render("cart.ejs", { product: null, error: "Selected variant not available" });
        }

        if (selectedVariant.stock < qty) {
            return res.status(400).render("cart.ejs", { product: null, error: "Not enough stock available" });
        }

        const userId = req.session.userId;
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.product.toString() === product._id.toString() &&
                item.variant.size === variantSize &&
                item.variant.color === variantColor
        );

        if (existingItemIndex > -1) {
            if (cart.items[existingItemIndex].quantity + qty > selectedVariant.stock) {
                return res.status(400).render("cart.ejs", {
                    product: null,
                    error: "Not enough stock available",
                });
            }
            cart.items[existingItemIndex].quantity += qty;
        } else {
            cart.items.push({
                product: product._id,
                quantity: qty,
                variant: {
                    color: variantColor,
                    size: variantSize,
                },
                price: product.price,
            });
        }

        await cart.save();
        await Wishlist.updateOne(
            { user: userId },
            { $pull: { items: { product: productId } } }
        );

        res.redirect("/cart");
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.redirect('/cart');
    }
};


exports.addAddress = async (req, res) => {
    console.log("add address >> ",req.body);
    try {
        const userId = req.session.userId;
        const { state, zip, country, landmark, locality, phone, email, username } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found");
        }

        const address = new Address({
            username,
            email,
            state,
            zip,
            country,
            landmark,
            locality,
            phone
        });

        const savedAddress = await address.save();
        user.addresses.push(savedAddress._id);
        const result = await user.save();

        if (result) {
            req.flash('success', 'Address Added 👍');
            res.redirect("/profile");
        } else {
            req.flash('error', "Address isn't Added. Try Again ⚠️");
            res.redirect('/profile');
        }
    } catch (error) {
        console.error("Error adding address:", error);
        req.flash('error', "Fill all fields!! ⚠️");
        res.redirect('/profile');
    }
};

exports.updateCheckoutStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        await Checkout.updateOne({ user: req.session.userId }, { $set: { orderStatus } });
        res.redirect('/orderhistory');
    } catch (err) {
        console.log(err);
        res.redirect('/orderhistory');
    }
};
