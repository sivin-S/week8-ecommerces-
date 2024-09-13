const { Product } = require("../model/productSchema");
const Category = require("../model/categorySchema");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.setHeader("Cache-Control", "no-store");
    res.render("index.ejs", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/");
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const allProducts = await Product.find({}).populate("category");
    
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render("404.ejs");
    }
    res.render("productDetails.ejs", { product, allProducts });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/");
  }
};

exports.getShop = async (req, res) => {
  try {
    const { category, gender, color, size, brand, minPrice, maxPrice, sort, page = 1, limit = 12, search } = req.query;
    let query = {};
    if (category) {
      const categories = category.split(',').map(cat => cat.trim());
      
      const categoryDocs = await Category.find({ 'name': { $in: categories } });
      
      if (categoryDocs.length > 0) {
        query['category'] = { $in: categoryDocs.map(doc => doc._id) };
      } else {
        query['category'] = null;
      }
    }
    if (gender) query['gender'] = gender;
    if (color) query['variants.color'] = color;
    if (size) query['variants.size'] = size;
    if (brand) query.brand = brand;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    let sortOption = {};
    if (sort === 'priceAsc') sortOption.price = 1;
    else if (sort === 'priceDesc') sortOption.price = -1;
    else if (sort === 'nameAsc') sortOption.name = 1;
    else if (sort === 'nameDesc') sortOption.name = -1;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    // querying products
    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);
    const uniqueCategories = await Category.distinct('name');
    const uniqueColors = await Product.distinct('variants.color');
    const uniqueSizes = await Product.distinct('variants.size');
    const uniqueBrands = await Product.distinct('brand');
    const priceRange = await Product.aggregate([
      { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
    ]);
    // console.log(products);
    
    res.render("shop", {
      products,
      uniqueCategories,
      uniqueColor: uniqueColors,
      uniqueSize: uniqueSizes,
      uniqueBrand: uniqueBrands,
      priceRange: priceRange[0],
      currentPage: parseInt(page),
      totalPages,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.redirect('/shop');
  }
};
