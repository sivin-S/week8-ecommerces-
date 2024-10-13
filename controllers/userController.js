const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../model/dbUserSchema");
const Address = require("../model/addressSchema");
const Wishlist = require("../model/wishList");
const Checkout = require("../model/checkoutSchema");
const Cart = require("../model/cartSchema");
const { Product } = require("../model/productSchema");
const Coupon = require("../model/couponSchema");
const Transaction = require("../model/transactionSchema");
const Razorpay = require('razorpay');
const crypto = require('crypto');
// require("dotenv").config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


exports.createRazorpayOrder = async (req, res) => {
    // console.log("req.body >>>>> ",req.body);
    try {
      const options = {
        amount: req.body.amount,
        currency: "INR",
        receipt: "order_rcptid_" + Math.random().toString(36).substring(7)
      };
      const order = await razorpay.orders.create(options);
    //   console.log("order >>>>> ",order);
      res.json(order);
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ error: "Unable to create order" });
    }
  };


  exports.getWalletHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const skip = (page - 1) * limit;
        const userId = req.session.userId;

        const user = await User.findById(userId).populate({
            path: 'wallet.transactions',
            options: {
                sort: { date: -1 },
                skip: skip,
                limit: limit
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const totalTransactions = user.wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        const walletData = {
            balance: user.wallet.balance,
            transactions: user.wallet.transactions
        };

        res.json({
            success: true,
            wallet: walletData,
            currentPage: page,
            totalPages: totalPages,
            totalTransactions: totalTransactions
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to fetch wallet history" });
    }
}


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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;
    const userId = new mongoose.Types.ObjectId(req.session.userId);
    try {
        
        const wishlist = await Wishlist.findOne({ user: userId }).populate({
            path: "items.product",
            options: {
                skip: skip,
                limit: limit
            }
        });
      
        const totalItems = await Wishlist.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalItems / limit);

    res.render('wishList.ejs', {
      products: wishlist,
      currentPage: page,
      totalPages: totalPages,
      limit: limit
    });
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
        const userId = req.session.userId;
        // console.log("userId >>>>>>>>>>>>>>>>>>>>>>>>",userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const totalOrders = await Checkout.countDocuments({user: req.session.userId});
        const totalPages = Math.ceil(totalOrders / limit);

        // console.log("totalPages >>>>>>>>>>>>>>>>>>>>>>>>",totalPages);


        const checkOut = await Checkout.find({user: userId})
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limit)
            .populate('user')
            .populate('address')
            .populate({
                path: 'cart.items.product',
                model: 'Product'  
            });

        // console.log("checkOut >>>>>>>>>>>>>>>>>>>>>");
    //    console.log(checkOut);
       
       
        res.render("orderHistory.ejs", { 
            checkOut ,
            currentPage: page,
            totalPages: totalPages
        });
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
    
    res.render('orderHistoryDetails.ejs',{checkout})

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
        const currentDate = new Date();
        const coupons = await Coupon.find({ 
            expiryDate: { $gt: currentDate },
            status: true
        });
        console.log("coupon >>>>>>>>>>>>>>>>>>>>>>>>",coupons);
        const user = await User.find({ _id: userId }).populate('addresses');
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            req.flash('error', 'Your cart is empty. Please add items before proceeding to checkout.');
            return res.redirect('/cart');
        }

        console.log("User:", user);
        console.log("Cart:", cart);

        res.render("checkout.ejs", { user, cart: [cart], coupons, razorpayKeyId : process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error("Error in getCheckout:", err);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect("/cart");
    }
};







exports.applyCoupon = async (req, res) => {
    console.log("applyCoupon >>>>>>>>>>>>>>>>>>>>>>>>", req.body);
    try {
        const { couponCode, totalAmount } = req.body;
        const coupon = await Coupon.findOne({ couponCode });

        console.log("coupon >>>>>>>>>>>>>>>>>>>>>>>>",coupon);

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        const currentDate = new Date();
        if (currentDate < new Date(coupon.startDate)) {
            return res.status(400).json({ success: false, message: 'This coupon is not yet active' });
        }

        if (currentDate > new Date(coupon.expiryDate)) {
            return res.status(400).json({ success: false, message: 'This coupon has expired' });
        }

        if (totalAmount < coupon.minPurchaseAmount) {
            return res.status(400).json({ 
                success: false, 
                message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} not met`
            });
        }



          // offerPrice is in (%) reminder  
          const discountPercentage = coupon.offerPrice;
          const discountAmount = (totalAmount * discountPercentage) / 100;
          let discountedPrice = totalAmount - discountAmount;
  
          discountedPrice = Math.max(0, discountedPrice);
  
          return res.json({
              success: true,
              message: 'Coupon applied successfully',
              discountedPrice,
              discount: discountAmount
          });
  
       

      

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon' });
    }
};





















exports.checkout = async (req, res) => {
    try {
        console.log("Checkout request body:", req.body);
        
        const userId = req.session.userId;
        
        const { address: addressId, paymentMethod, discountedPrice, appliedCoupon } = req.body;

        console.log("Extracted data:", { addressId, paymentMethod, discountedPrice, appliedCoupon });

        if (!addressId) {
            return res.status(400).json({ success: false, message: 'Address ID is missing' });
        }

        const address = await Address.findById(addressId);

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty. Please add items before proceeding to checkout.' });
        }

        console.log("Cart:", cart);

        let totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

      
        let discount = 0;
        if (appliedCoupon) {
            const coupon = await Coupon.findOne({ couponCode: appliedCoupon });
            if (coupon && coupon.status && new Date() <= coupon.expiryDate) {
                if (totalAmount >= coupon.minPurchaseAmount) {
                    discount = coupon.offerPrice;
                    totalAmount -= discount;
                } else {
                    
                    return res.status(400).json({ success: false, message: 'Minimum purchase amount for coupon not met' });
                }
            } else {
              
                return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
            }
        }
       
        if (Math.abs(totalAmount - parseFloat(discountedPrice)) > 0.01) { 
            return res.status(400).json({ success: false, message: 'Price mismatch. Please try again.' });
        }
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            const variant = product.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
            
            if (!variant || variant.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Not enough stock for ${product.name} (${item.variant.color}, ${item.variant.size})` });
            }
            
            variant.stock -= item.quantity;
            await product.save();
        }


        if (paymentMethod === 'Online') {
        
            const {
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature
            } = req.body;
      
            const generatedSignature = crypto
              .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
              .update(`${razorpayOrderId}|${razorpayPaymentId}`)
              .digest('hex');
      
            if (generatedSignature !== razorpaySignature) {
              return res.status(400).json({ success: false, message: 'Invalid payment signature' });
            }
      
          }



        

        const checkout = new Checkout({
            user: userId,
            cart: cart,
            address: {
                username: address.username,
                email: address.email,
                state: address.state,
                zip: address.zip,
                phone: address.phone,
                country: address.country,
                landmark: address.landmark,
                locality: address.locality
            },
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'Online' ? 'Completed' : 'Pending',

            orderStatus: 'Processing',
          
            totalPrice: totalAmount,
            appliedCoupon: appliedCoupon,
            discount: discount,
            transactionId: paymentMethod === 'Online' ? req.body.razorpayPaymentId : null
        });

        await checkout.save();

        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [], totalAmount: 0 } });

        res.status(200).json({ success: true, message: 'Checkout successful', redirectUrl: '/orderhistory' });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during checkout' });
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

exports.getWalletBalance = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('wallet.transactions');
        res.json({ success: true, balance: user.wallet.balance });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
}





exports.returnOrder = async (req, res) => {
    
    try {
        const orderId = req.params.orderId;
        const order = await Checkout.findById(orderId).populate('user').populate('cart.items.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Order cannot be returned' });
        }

      
        order.previousOrderStatus = order.orderStatus;
        order.orderStatus = 'Returned';

    
        for (const item of order.cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
                if (variant) {
                    variant.stock += item.quantity;
                }
                await product.save();
            }
        }

       
        const user = order.user;
        user.wallet.balance += order.totalPrice;
        
        const transaction = new Transaction({
            user: user._id,
            amount: order.totalPrice,
            type: order.paymentMethod,
            description: `Refund for order ${order._id}`
        });
        await transaction.save();
        
        user.wallet.transactions.push(transaction._id);
        await user.save();

        await user.save();
        await order.save();

        res.json({ success: true, message: 'Order returned successfully' });
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ success: false, message: 'Failed to return order' });
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
    console.log("checkout status >>>",req.body);
    try {
        const { orderStatus } = req.body;
        await Checkout.updateOne({ user: req.session.userId }, { $set: { orderStatus } });
        res.redirect('/orderhistory');
    } catch (err) {
        console.log(err);
        res.redirect('/orderhistory');
    }
};