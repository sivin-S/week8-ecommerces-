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
        if (!userData) {
            return res.status(404).send("User not found");
        }
        res.render("profile.ejs", { userData });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("Error fetching user data");
    }
};

exports.editAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            req.flash('error', "Invalid user ID");
            return res.redirect("/profile");
        }

        const { index, username, age, gender, phone, zip, locality, state, country, landmark } = req.body;

        if (index !== '' && (isNaN(index) || index < 0)) {
            req.flash('error', "Invalid address index");
            return res.redirect("/profile");
        }

        const user = await User.findById(userId).populate('addresses');
        if (!user) {
            return res.status(404).send("User not found");
        }

        const newAddressData = { phone, zip, locality, state, country, landmark };

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
            await Address.findByIdAndUpdate(addressId, { $set: newAddressData });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser._id.toString() !== userId) {
            req.flash('error', "Username already exists");
            return res.redirect("/profile");
        }

        user.username = username;
        user.age = age;
        user.gender = gender;

        const result = await user.save();
        if (result) {
            req.flash('success', "Address edited successfully");
            res.redirect("/profile");
        } else {
            req.flash('error', "Try again editing address");
            res.redirect("/profile");
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

        console.log("checkOut >>>>>>>>>>>>>>>>>>>>>");
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
    
    console.log("checkout >>>>>>>>>>>");
    console.log(checkout);
    
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

        console.log('Updated order:', updatedCheckout);
        res.redirect('/orderhistory');
    } catch (err) {
        console.log(err);
        res.redirect('/orderhistory');
    }
};




exports.getCheckout = async (req, res) => {
    try {
        const user = await User.find({ _id: req.session.userId }).populate('addresses');
        const cart = await Cart.find({ user: req.session.userId });
        res.render("checkout.ejs", { user, cart });
    } catch (err) {
        console.log(err);
        res.redirect("/checkOut");
    }
};

exports.checkout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { address, paymentMethod } = req.body;

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            const variant = product.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
            
            if (!variant || variant.stock < item.quantity) {
                req.flash('error', `Not enough stock for ${product.name} (${item.variant.color}, ${item.variant.size})`);
                return res.redirect('/cart');
            }

            variant.stock -= item.quantity;
            await product.save();
        }

        const checkout = new Checkout({
            user: userId,
            cart: cart,
            address: address,
            paymentMethod: paymentMethod,
            paymentStatus: 'Pending',
            orderStatus: 'Processing'
        });

        await checkout.save();

        // Clear the cart
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
