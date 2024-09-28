const { Product } = require("../model/productSchema");
const Category = require("../model/categorySchema");
const mongoose = require('mongoose');


exports.getProducts = async (req, res) => {
  try {
  
    const nonDeletedCategories = await Category.find({ deleted: false });
    const nonDeletedCategoryIds = nonDeletedCategories.map(cat => cat._id);


    const products = await Product.find({ category: { $in: nonDeletedCategoryIds } })
      .populate('category');

      console.log("products ==>"+ products);

    res.setHeader("Cache-Control", "no-store");
    res.render("index.ejs", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/");
  }
};

exports.getProductDetails = async (req, res) => {
  const productId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(404).render('404Page.ejs',{message:"No Product Was Found"});
}
  try {
   

   

    const allProducts = await Product.find({}).populate("category");
    
    
    const product = await Product.findById(req.params.id).populate("category");
    // console.log("product ==>"+ product);
    if (!product) {
      return res.status(404).render("404Page.ejs",{message:"No Product Was Found"});
    }
    // console.log("product ==>"+ product);
    // console.log("all product ==>"+ allProducts);
    
    res.render("productDetails.ejs", { product, allProducts });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/");
  }
};




// filtering variants

exports.filterVariant = async (req, res) => {
  console.log('Query Parameters:', req.query);

  try {
    const { productId, variantColor, size } = req.query;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid Product ID' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product found:', product.name);
    console.log('Variants:', JSON.stringify(product.variants, null, 2));

    let filteredVariants = product.variants;

    if (variantColor) {
      console.log('Filtering by color:', variantColor);
      filteredVariants = filteredVariants.filter(v => v.color === variantColor);
    }

    if (size) {
      console.log('Filtering by size:', size);
      filteredVariants = filteredVariants.filter(v => v.size === size);
    }

    console.log('Filtered variants:', JSON.stringify(filteredVariants, null, 2));

    if (filteredVariants.length === 0) {
      return res.json({ message: 'No variants found for the selected criteria' });
    }

    const response = {
      variants: filteredVariants.map(v => ({
        ...v.toObject(),
        price: product.price,
        name: product.name,
        description: product.description,
        offerHasApplied: product.offerHasApplied,
        discountedPrice: product.discountedPrice
      }))
    };

    console.log('Response:', JSON.stringify(response, null, 2));

    res.json(response);

  } catch (error) {
    console.error("Error filtering variants:", error);
    res.status(500).json({ 
      message: 'An error occurred while filtering variants', 
      error: error.message,
      stack: error.stack
    });
  }
};












exports.getShop = async (req, res) => {
  try {
    const { category, gender, color, size, brand, minPrice, maxPrice, sort, page = 1, limit = 4, search } = req.query;
    let query = { deleted: false };

    // Category filter
    if (category) {
      const categories = category.split(',').map(cat => cat.trim());
      const categoryDocs = await Category.find({ 'name': { $in: categories }, 'deleted': false });
      if (categoryDocs.length > 0) {
        query.category = { $in: categoryDocs.map(doc => doc._id) };
      }
    } else {
      const nonDeletedCategories = await Category.find({ deleted: false });
      query.category = { $in: nonDeletedCategories.map(cat => cat._id) };
    }

    // Other filters
    if (gender) query.gender = gender;
    if (color) query['variants.color'] = color;
    if (size) query['variants.size'] = size;
    if (brand) query.brand = brand;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Sorting
    let sortOption = {};
    if (sort === 'priceAsc') sortOption.price = 1;
    else if (sort === 'priceDesc') sortOption.price = -1;
    else if (sort === 'nameAsc') sortOption.name = 1;
    else if (sort === 'nameDesc') sortOption.name = -1;

    // Pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [products, totalProducts, uniqueCategories, uniqueColors, uniqueSizes, uniqueBrands, priceRange] = await Promise.all([
      Product.find(query).populate("category").sort(sortOption).skip(skip).limit(limit),
      Product.countDocuments(query),
      Category.distinct('name', { deleted: false }),
      Product.distinct('variants.color', query),
      Product.distinct('variants.size', query),
      Product.distinct('brand', query),
      Product.aggregate([
        { $match: query },
        { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
      ])
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shop", {
      products,
      uniqueCategories,
      uniqueColors: uniqueColors,
      uniqueSizes: uniqueSizes,
      uniqueBrands: uniqueBrands,
      priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
      currentPage: parseInt(page),
      totalPages,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'An error occurred while fetching products' });
  }
};
