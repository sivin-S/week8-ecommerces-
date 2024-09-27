const bcrypt = require("bcrypt");
const path = require("path");
const { Product, Variant } = require("../model/productSchema");
const User = require("../model/dbUserSchema");
const fs = require("fs");
const Admin = require("../model/dbAdminSchema");
const Category = require("../model/categorySchema");
const Checkout = require("../model/checkoutSchema");
const Coupon = require("../model/couponSchema");
const mongoose = require("mongoose");
const ProductOffer = require("../model/productOfferSchema");
const CategoryOffer = require("../model/categoryOfferSchema");

// Ensure the uploads/img directory exists
const uploadDir = path.join(__dirname, "../uploads", "img");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Function to render the admin dashboard
async function dashboard(req, res) {
    try {
        const productData = await Product.find({}).populate('category');
        const user = await User.find({});
        res.setHeader('Cache-Control', 'no-store');
        res.render('adminDashboard.ejs', { productData, user });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

async function products(req, res) {
    try {
        const productData = await Product.find({}).populate('category');
        res.render('productManagement.ejs', { productData });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the login page
function loginPage(req, res) {
    if (req.session.adminStatus) {
        res.redirect("/admin");
    } else {
        res.setHeader('Cache-Control', 'no-store');
        res.render('adminLogin.ejs');
    }
}

// Function to render the add men's product page
async function addProductsPage(req, res) {
    try {
        const categories = await Category.find({});
        res.render('addProducts.ejs', { categories });
    } catch (err) {
        console.log(err);
        res.render('addProducts.ejs', { categories: [] });
    }
}



// Function to render the user list page
async function userList(req, res) {
    try {
        const user = await User.find({}).populate("addresses");
        console.log("userList >>>>>>>>>>>>",user);
        res.render('userList.ejs', { user });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to toggle the user state (block/unblock)
async function toggleUserState(req, res) {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (user) {
            user.isBlocked = !user.isBlocked; 
            await user.save();
            res.json({ success: true, isBlocked: user.isBlocked });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Function to render the order list page
async function orderList(req, res) {
    try {
        const checkOut = await Checkout.find({})
            .populate("user")
            .populate("cart.items.0.product")
            .sort({ createdAt: -1 }); 
        console.log("checkOut >> ", checkOut);
        res.render('ordersList.ejs', { checkOut });
    } catch (err) {
        console.log(err);
        res.redirect('/orderList');
    }
}


async function productOffers(req, res) {
    try {
        const products = await Product.find({});
        
        const itemsPerPage = 5;
        const page = parseInt(req.query.page) || 1;

        const totalOffers = await ProductOffer.countDocuments();
        const totalPages = Math.ceil(totalOffers / itemsPerPage);

        const productOffers = await ProductOffer.find()
            .populate({
                path: 'productId',
                model: 'Product'
            })
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        console.log("productOffers >>>>>>>>>>>>>>>>>>>>", productOffers);
        res.render('productOfferAdminPage.ejs', { 
            products, 
            productOffers,
            currentPage: page,
            totalPages,
            itemsPerPage
        });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}


async function categoryOffers(req, res) {
    try {
        const categories = await Category.find({});
        
        const itemsPerPage = 5;
        const page = parseInt(req.query.page) || 1;

        const totalOffers = await CategoryOffer.countDocuments({ endDate: { $gt: new Date() } });
        const totalPages = Math.ceil(totalOffers / itemsPerPage);

        const categoryOffers = await CategoryOffer.find({ endDate: { $gt: new Date() } })
            .populate('categoryId')
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        console.log("categoryOffers >>>>>>>>>>" ,categoryOffers);

        const categoriesWithActiveOffers = await CategoryOffer.distinct('categoryId', { endDate: { $gt: new Date() } });

        const categoriesForSelect = categories.map(category => ({
            ...category.toObject(),
            hasActiveOffer: categoriesWithActiveOffers.some(id => id.equals(category._id))
        }));

        res.render('categoryOfferAdminPage.ejs', { 
            categories: categoriesForSelect, 
            categoryOffers,
            currentPage: page,
            totalPages,
            itemsPerPage
        });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}


async function addCategoryOffer(req, res) {
    try {
        const { offerName, categoryId, discountPercentage, startDate, endDate, isActive } = req.body;
        
        console.log("Received data for addCategoryOffer:", req.body);

        if (!offerName || !categoryId || !discountPercentage || !startDate || !endDate) {
            console.log("Missing required fields:", { offerName, categoryId, discountPercentage, startDate, endDate });
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            console.log("Category not found for ID:", categoryId);
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const existingOffer = await CategoryOffer.findOne({ 
            categoryId: categoryId,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            console.log("Category already has an active offer:", existingOffer);
            return res.status(400).json({ success: false, message: 'This category already has an active offer' });
        }

        const newOffer = new CategoryOffer({
            offerName,
            categoryId,
            discountPercentage: Number(discountPercentage),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: isActive !== undefined ? isActive : true
        });

        await newOffer.save();

        category.discountPercentage = Number(discountPercentage);
        category.offerApplied = true;
        await category.save();

       
        const products = await Product.find({ category: categoryId });

        for (let product of products) {
           
            const productOffer = await ProductOffer.findOne({
                productId: product._id,
                endDate: { $gt: new Date() }
            });

            if (productOffer) {
                
                if (Number(discountPercentage) > productOffer.offerPercentage) {
                   
                    await ProductOffer.findByIdAndDelete(productOffer._id);
                    product.offerHasApplied = true;
                    product.discountedPrice = product.price * (1 - Number(discountPercentage) / 100);
                } else {
                    
                    continue;
                }
            } else {
              
                product.offerHasApplied = true;
                product.discountedPrice = product.price * (1 - Number(discountPercentage) / 100);
            }

            await product.save();
        }

        console.log("Category offer added successfully:", newOffer);
        res.json({ success: true, message: 'Category offer added successfully', offer: newOffer });
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({ success: false, message: 'Failed to add category offer', error: error.message });
    }
}

async function removeCategoryOffer(req, res) {
    try {
        const offerId = req.params.offerId;
        const offer = await CategoryOffer.findByIdAndDelete(offerId);
        
        if (offer) {
            const category = await Category.findById(offer.categoryId);
            if (category) {
                category.discountPercentage = 0;
                category.offerApplied = false;
                await category.save();

                await Product.updateMany(
                    { category: offer.categoryId },
                    { 
                        $set: { 
                            offerHasApplied: false,
                            discountedPrice: null
                        }
                    }
                );
            }
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Offer not found' });
        }
    } catch (error) {
        console.error('Error removing offer:', error);
        res.json({ success: false, message: 'Server error' });
    }
}





// function to get order details fetch "ajax method"
async function getOrderDetails(req, res) {
    try {
        const orderId = req.params.id;
        const order = await Checkout.findById(orderId).populate("user").populate("cart.items.product")
        ;

        console.log("order >>>>>>>");
        console.log(order);
        
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        console.error('Error fetching order details:', err);
        res.status(500).json({ error: 'Server error' });
    }
}





// Function to render the payment methods page
function paymentMethods(req, res) {
    // res.render('paymentMethods.ejs');
    try{
        res.render('paymentMethods.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the sales report page
function salesReport(req, res) {
    // res.render('report.ejs');
    try {
        res.render('report.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the coupons history page
async function couponsHistory(req, res) {
    try {
         const coupons = await Coupon.find({});

          console.log("coupon >>>>>>>>>>>>>>>>",coupons);
        res.render('couponsHistory.ejs', { coupons });

    } catch (err) {
        console.log(err);
        res.redirect('/admin/couponsHistory');
    }
}

// Function to render the categories page
async function categories(req, res) {
    try {
        const mensCategory = await Category.find({ gender: 'mens' });
        const womensCategory = await Category.find({ gender: 'womens' });
        res.render('category.ejs', { mensCategory, womensCategory });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

async function getCoupons(req, res) {
    try {
        const coupons = await Coupon.find();
        const currentDate = new Date();
    
        const updatedCoupons = coupons.map(coupon => {
          if (coupon.expiryDate < currentDate && coupon.status) {
            coupon.status = false;
            coupon.save();
          }
          return {
            _id: coupon._id,
            couponCode: coupon.couponCode,
            offerPrice: coupon.offerPrice,
            minPurchaseAmount: coupon.minPurchaseAmount,
            expiryDate: coupon.expiryDate,
            status: coupon.status
          };
        });
    
        res.json(updatedCoupons);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ success: false, message: 'Error fetching coupons' });
      }
}



async function refreshCouponList(req, res) {
    try {
        const coupon = await Coupon.find({});
        res.json({success: true, coupon});
    } catch (err) {
        console.log(err);
        res.json({success: false, error: "An error occurred while refreshing the coupon list."});
    }
}
// Function to soft delete a product (toggle deleted state)
async function softDeleteProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.deleted = !product.deleted;
            await product.save();
        }
        // res.redirect('/admin');
        res.json({success:true,deleted:product.deleted,message:"Product status updated successfully!"});

    } catch (err) {
        console.log(err);
        // res.redirect('/admin');
        res.json({success:false,error:"An error occurred while updating the product status."});

    }
}

// Function to soft delete a category (toggle deleted state)
async function softDeleteCategory(req, res) {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            category.deleted = !category.deleted; // Toggle the deleted state
            await category.save();
        }
        res.redirect('/admin/categories');
    } catch (err) {
        console.log(err);
        res.redirect('/admin/categories');
    }
}

// Function to render the order status page
async function orders(req, res) {
    try {
        const checkOut = await Checkout.find({})
        .populate("user")
        .populate("cart.items.0.product")
        .sort({ createdAt: -1 });
        res.render('orderManagement.ejs', { checkOut });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the transaction history page
function transactionHistory(req, res) {
    // res.render('transactionHistory.ejs');
    try{
        res.render('transactionHistory.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the notifications page
function notifications(req, res) {
    // res.render('notification.ejs');
    try{
        res.render('notification.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the edit product page
async function editProductPage(req, res) {
    try {
        const categories = await Category.find({});
        const productDetails = await Product.findById(req.params.id).populate('category');
        console.log("categories"+categories);
        console.log("productDetails"+productDetails);
    
        
        res.render('editProduct.ejs', { productDetails, categories,path });
    } catch (err) {
        console.error('Error fetching product details:', err);
        res.redirect('/admin');
    }
}

// Function to handle admin logout
function logout(req, res) {
    req.session.destroy(function (err) {
        if (!err) {
            res.clearCookie("connect.sid");
            res.redirect("/admin/login");
        } else {
            res.status(500).send('Failed to destroy session');
        }
    });
}

// Function to add a new category
async function addCategory(req, res) {
    try {
        const { category: categoryName, gender } = req.body;

        if (gender !== "mens" && gender !== "womens") {
            req.flash('error', "Invalid gender. Must be 'mens' or 'womens'.");
            return res.redirect('/admin/categories');
        }

        const existingCategory = await Category.findOne({ name: categoryName, gender });

        if (existingCategory) {
            req.flash('error', "Category already exists for this gender!");
            return res.redirect('/admin/categories');
        }

        const newCategory = new Category({ name: categoryName, gender, deleted: false });
        await newCategory.save();

        req.flash('success', "Category added successfully!");
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error adding category:', error);
        req.flash('error', "An error occurred while adding the category.");
        res.redirect('/admin/categories');
    }
}

// Function to update the checkout status
async function checkOutStatus(req, res) {
    // console.log(req.body);
    try {
        const { orderStatus, userId } = req.body;

        const checkout = await Checkout.findOne({ user: userId });
        if (!checkout) {
            // return res.status(404).send('Checkout not found');
            // req.flash('error', "Checkout not found");
            res.json({success:false,error:"Checkout not found"});
            // return res.redirect('/admin/orders');
        }


        checkout.previousOrderStatus = checkout.orderStatus;
        checkout.orderStatus = orderStatus;
        const updatedCheckout = await checkout.save();
        // console.log(cart.orderStatus);
        // req.flash('success', "Order status updated to " + cart?.orderStatus + " successfully!");
        // res.redirect('/admin/orders');
        res.json({success:true,message:"Order status updated successfully!",updatedCheckout});
    } catch (err) {
        console.log(err);
       
        // req.flash('error', "An error occurred while updating the order status.");
        // res.redirect('/admin/orders');
        res.json({success:false,error:"An error occurred while updating the order status."});
    }
}


// Function to edit a category
async function editCategory(req, res) {
    try {
        const { oldName, newName, gender } = req.body;

        if (gender !== "mens" && gender !== "womens") {
            req.flash('error', "Invalid gender. Must be 'mens' or 'womens'.");
            return res.redirect('/admin/categories');
        }


        const existingCategory = await Category.findOne({ 
            name: newName, 
            gender: gender,
            _id: { $ne: req.params.id } 
        });

        if (existingCategory) {
            req.flash('error', "Category with this name already exists for this gender!");
            return res.redirect('/admin/categories');
        }

        const updatedCategory = await Category.findOneAndUpdate(
            { name: oldName },
            { $set: { name: newName, gender } },
            { new: true }
        );

        if (!updatedCategory) {
            req.flash('error', "Category not found.");
            return res.redirect('/admin/categories');
        }

        req.flash('success', "Category updated successfully!");
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Error editing category:', err);
        req.flash('error', "An error occurred while editing the category.");
        res.redirect('/admin/categories');
    }
}

// Function to handle admin login
async function login(req, res) {
    try {
        const admin = await Admin.findOne({ email: req.body.email });

        if (admin && await bcrypt.compare(req.body.password, admin.password)) {
            req.session.email = admin.email;
            req.session.adminStatus = true;
            req.session.user = { isAdmin: true };
            console.log("Login successful:", req.session);
            res.redirect("/admin");
        } else {
            console.log("Invalid email or password");
            res.status(401).render('adminLogin.ejs');
        }
    } catch (err) {
        console.error("Error during admin login:", err);
        res.status(500).render('adminLogin.ejs');
    }
}

// Function to edit a product
async function editProduct(req, res) {
    try {
        const productId = req.params.id;
        const { productName, price, gender, category, descriptionOfProduct, brand } = req.body;

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).send('Product not found');
        }

        existingProduct.name = productName;
        existingProduct.description = descriptionOfProduct;
        existingProduct.price = price;
        existingProduct.category = category;
        existingProduct.gender = gender;
        existingProduct.brand = brand;

        const variants = parseVariantsFromRequestBody(req.body);

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            let variantImages = [];

            if (existingProduct.variants[i] && existingProduct.variants[i].imageUrls) {
                variantImages = [...existingProduct.variants[i].imageUrls];
            }

            if (req.files) {
                for (let j = 0; j < 3; j++) {
                    const fileKey = `variants[${i}][images][${j}]`;
                    if (req.files[fileKey]) {
                        // Delete the old image if it exists
                        if (variantImages[j]) {
                            const oldImagePath = path.join(__dirname, '..', variantImages[j]);
                            fs.unlink(oldImagePath, (err) => {
                                if (err) {
                                    console.error(`Failed to delete old image: ${oldImagePath}`, err);
                                }
                            });
                        }

                        // Upload the new image
                        const file = req.files[fileKey];
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                        const fileName = file.name + '-' + uniqueSuffix + path.extname(file.name);
                        const filePath = path.join(__dirname, '..', 'uploads', 'img', fileName);

                        await file.mv(filePath);
                        const newImageUrl = `/uploads/img/${fileName}`;

                        variantImages[j] = newImageUrl;
                    }
                }
            }

            if (existingProduct.variants[i]) {
                existingProduct.variants[i].color = variant.color;
                existingProduct.variants[i].size = variant.size;
                existingProduct.variants[i].stock = variant.stock;
                existingProduct.variants[i].imageUrls = variantImages;
            } else {
                existingProduct.variants.push({
                    color: variant.color,
                    size: variant.size,
                    stock: variant.stock,
                    imageUrls: variantImages
                });
            }
        }

        existingProduct.variants = existingProduct.variants.slice(0, variants.length);

        await existingProduct.save();
        req.flash('success', "Product updated successfully!");
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}




//  parse variants from the req.body
function parseVariantsFromRequestBody(body) {
    const variants = [];
    for (let key in body) {
        if (key.startsWith('variants[')) {
            const match = key.match(/variants\[(\d+)\]\[(\w+)\]/);
            if (match) {
                const index = parseInt(match[1], 10);
                const field = match[2];
                variants[index] = variants[index] || {};
                if (field === 'existingImages') {
                    variants[index].existingImages = variants[index].existingImages || [];
                    variants[index].existingImages.push(body[key]);
                } else {
                    variants[index][field] = body[key];
                }
            }
        }
    }
    return variants;
}


// Function to add  products
async function addProducts(req, res) {
    try {
        // console.log(req.body);
        
        const { productName, price, gender, category, descriptionOfProduct, brand } = req.body;

        const newProduct = new Product({
            name: productName,
            description: descriptionOfProduct,
            price,
            category,
            gender,
            deleted: false,
            brand,
            variants: []
        });

        const variants = parseVariantsFromRequestBody(req.body);

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const variantImages = [];

            if (req.files && req.files[`variants[${i}][images]`]) {
                const images = Array.isArray(req.files[`variants[${i}][images]`])
                    ? req.files[`variants[${i}][images]`]
                    : [req.files[`variants[${i}][images]`]];

                for (let file of images) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const fileName = file.name + '-' + uniqueSuffix + path.extname(file.name);
                    const filePath = path.join(__dirname, '..', 'uploads', 'img', fileName);

                    await file.mv(filePath);
                    variantImages.push(`/uploads/img/${fileName}`);
                }
            }

            newProduct.variants.push({ color: variant.color, size: variant.size, stock: variant.stock, imageUrls: variantImages });
        }

        await newProduct.save();
        req.flash('success', "Product added successfully!");
        res.redirect('/admin/addProducts');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/addProducts');
    }
}

// Function to render the coupons creation page
async function couponsCreate(req, res) {
    console.log('couponsCreate >>>>>>>>>>>>>>>>>>>>',req.body);
    try {
        const { couponCode, offerPrice, minPurchaseAmount, expiryDate } = req.body;

        if (!couponCode || couponCode.trim() === '') {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }


         const existingCoupon = await Coupon.findOne({ couponCode });
         if (existingCoupon) {
             return res.status(400).json({ success: false, message: 'A coupon with this code already exists' });
         }
 
         const newCoupon = new Coupon({
             couponCode,
             offerPrice,
             minPurchaseAmount,
             expiryDate
         });
 
         await newCoupon.save();
        
        res.json({ success: true, message: "Coupon created successfully", coupon: newCoupon });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Error creating coupon", error: err.message });
    }
}

async function removeCoupon(req, res) {
    console.log('removeCoupon >>>>>>>>>>>>>>>>>>>>',req.params.id);
    try {
        const couponId = new mongoose.Types.ObjectId(req.params.id);
        const coupon = await Coupon.findByIdAndDelete(couponId);
        res.json({success:true,message:"Coupon removed successfully!",coupon});
    } catch (err) {
        console.log(err);
        res.json({success:false,error:"An error occurred while removing the coupon."});
    }
}

// ... existing code ...

async function addProductOffer(req, res) {
    try {
        const { offerName, productId, offerPercentage, startDate, endDate, isActive } = req.body;
        
        console.log("addProductOffer >>>>>>>>>>>>>>>>>>>>",req.body);

        if (!offerName || !productId || !offerPercentage || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const categoryOffer = await CategoryOffer.findOne({
            categoryId: product.category,
            endDate: { $gt: new Date() }
        });

        if (categoryOffer && Number(categoryOffer.discountPercentage) >= Number(offerPercentage)) {
            return res.status(400).json({ success: false, message: 'A better category offer already exists' });
        }

        const discountAmount = (product.price * offerPercentage) / 100;
        const discountedPrice = product.price - discountAmount;

        const newOffer = new ProductOffer({
            offerName,
            productId,
            offerPercentage: Number(offerPercentage),
            startDate,
            endDate,
            isActive
        });

        await newOffer.save();

        product.discountedPrice = Number(discountedPrice.toFixed(2));
        product.offerHasApplied = true;

        await product.save();

        res.json({ success: true, message: 'Product offer added successfully', offer: newOffer });
    } catch (error) {
        console.error('Error adding product offer:', error);
        res.status(500).json({ success: false, message: 'Failed to add product offer' });
    }
}

async function updateProductOfferStatus(req, res) {
    try {
        const { productId } = req.params;
        const { offerHasApplied } = req.body;

        await Product.findByIdAndUpdate(productId, { offerHasApplied });

        res.json({ success: true, message: 'Product offer status updated successfully' });
    } catch (error) {
        console.error('Error updating product offer status:', error);
        res.status(500).json({ success: false, message: 'Failed to update product offer status' });
    }
}

async function removeProductOffer(req, res) {
    try {
        const offerId = req.params.offerId;
        const offer = await ProductOffer.findByIdAndDelete(offerId);
        
        if (offer) {
            const product = await Product.findById(offer.productId);
            if (product) {
                product.discountedPrice = undefined;
                product.offerHasApplied = false;
                await product.save();
            }
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Offer not found' });
        }
    } catch (error) {
        console.error('Error removing offer:', error);
        res.json({ success: false, message: 'Server error' });
    }
}


async function removeProductImage(req, res) {
    try {
        const { productId } = req.params;
        const { variantIndex, imageIndex, imageUrl } = req.body;

       
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

      
        const variant = product.variants[variantIndex];
        if (variant && variant.imageUrls) {
            variant.imageUrls.splice(imageIndex, 1);
        }

      
        await product.save();

      
        const imagePath = path.join(__dirname, 'public', imageUrl);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('Error deleting image file:', err);
            }
        });

        res.json({ success: true, message: 'Image removed successfully' });
    } catch (error) {
        console.error('Error removing image:', error);
        res.status(500).json({ success: false, message: 'Failed to remove image' });
    }
}






module.exports = {
    dashboard,
    removeProductOffer,
    removeCoupon,
    removeProductImage,
    refreshCouponList,
    loginPage,
    userList,
    toggleUserState,
    orderList,
    paymentMethods,
    salesReport,
    couponsHistory,
    categories,
    softDeleteProduct,
    softDeleteCategory,
    orders,
    transactionHistory,
    notifications,
    editProductPage,
    logout,
    addCategory,
    checkOutStatus,
    editCategory,
    login,
    products,
    editProduct,
    couponsCreate,
    addProductsPage,
    addProducts,
    getOrderDetails,
    getCoupons,
    productOffers,
    categoryOffers,
    addProductOffer,
    updateProductOfferStatus,
    addCategoryOffer,

    removeCategoryOffer,
    categoryOffers
};
