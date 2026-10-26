import Review from '../../../admin_panel/modules/review/model.js';
import Product from '../../../admin_panel/modules/product/model.js';

/**
 * Get reviews for a product by slug (Database-only, strictly no static/seed data)
 */
export const getProductReviews = async (req, res) => {
    try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase().trim();

        // Find product to get ID and ensure it exists
        const product = await Product.findOne({
            $or: [{ slug: normalizedSlug }, { _id: /^[0-9a-fA-F]{24}$/.test(normalizedSlug) ? normalizedSlug : null }],
            status: 'active',
        }).select('_id name slug');

        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        // Fetch ONLY actual reviews saved in database for this specific product
        const dbReviews = await Review.find({
            $or: [{ product: product._id }, { productSlug: product.slug }],
            status: 'active',
        })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate statistics
        const totalReviews = dbReviews.length;
        const totalRatingSum = dbReviews.reduce((sum, r) => sum + (r.rating || 5), 0);
        const averageRating = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 0;

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        dbReviews.forEach((r) => {
            const star = Math.round(r.rating || 5);
            if (breakdown[star] !== undefined) {
                breakdown[star]++;
            }
        });

        return res.json({
            status: true,
            data: {
                reviews: dbReviews,
                stats: {
                    averageRating,
                    totalReviews,
                    breakdown,
                },
            },
        });
    } catch (err) {
        console.error('Error in getProductReviews:', err);
        return res.status(500).json({ status: false, message: err.message || 'Server error' });
    }
};

/**
 * Submit a customer review
 */
export const createProductReview = async (req, res) => {
    try {
        const { productSlug, productId, name, country, rating, message } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ status: false, message: 'Please enter your name' });
        }

        if (!country || !country.trim()) {
            return res.status(400).json({ status: false, message: 'Please enter your country' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ status: false, message: 'Please select a rating between 1 and 5 stars' });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ status: false, message: 'Please write your review message' });
        }

        // Find the product
        let targetProduct = null;
        if (productId && /^[0-9a-fA-F]{24}$/.test(productId)) {
            targetProduct = await Product.findById(productId).select('_id slug name images');
        } else if (productSlug) {
            targetProduct = await Product.findOne({ slug: productSlug.toLowerCase().trim() }).select('_id slug name images');
        }

        if (!targetProduct) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        const newReview = await Review.create({
            product: targetProduct._id,
            productSlug: targetProduct.slug,
            name: name.trim(),
            country: country.trim(),
            rating: Number(rating),
            message: message.trim(),
            status: 'active',
        });

        const primaryImage = targetProduct.images?.[0]?.publicUrl || targetProduct.images?.[0]?.url || '';

        return res.status(201).json({
            status: true,
            message: 'Thank you! Your review has been submitted successfully.',
            data: {
                _id: newReview._id,
                name: newReview.name,
                country: newReview.country,
                rating: newReview.rating,
                message: newReview.message,
                createdAt: newReview.createdAt,
                productName: targetProduct.name,
                productSlug: targetProduct.slug,
                productImage: primaryImage,
            },
        });
    } catch (err) {
        console.error('Error in createProductReview:', err);
        return res.status(500).json({ status: false, message: err.message || 'Server error' });
    }
};

/**
 * Get all recent customer reviews across all products for live social proof notifications
 */
export const getAllRecentReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ status: 'active' })
            .populate('product', 'name slug images price comparePrice')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const formatted = reviews.map((r) => {
            const prod = r.product || {};
            const primaryImg = prod.images?.[0]?.publicUrl || prod.images?.[0]?.url || '';
            return {
                _id: r._id,
                name: r.name,
                country: r.country,
                rating: r.rating || 5,
                message: r.message,
                createdAt: r.createdAt,
                productName: prod.name || 'Eclera Formulation',
                productSlug: prod.slug || r.productSlug || '',
                productImage: primaryImg,
            };
        });

        return res.json({
            status: true,
            data: formatted,
        });
    } catch (err) {
        console.error('Error in getAllRecentReviews:', err);
        return res.status(500).json({ status: false, message: err.message || 'Server error' });
    }
};
