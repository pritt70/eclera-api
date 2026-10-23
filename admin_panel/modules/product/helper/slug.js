import Product from '../model.js';

/**
 * Convert string to URL-friendly slug
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text = '') => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')     // Remove non-word characters except hyphens and spaces
        .replace(/[\s_-]+/g, '-')       // Replace multiple spaces or underscores with single hyphen
        .replace(/^-+|-+$/g, '');       // Trim leading/trailing hyphens
};

/**
 * Generate a unique slug by appending numbers if slug already exists in database
 * @param {string} text - Name or provided slug
 * @param {string|null} excludeId - Product ID to exclude from conflict check (for updates)
 * @returns {Promise<string>}
 */
export const generateUniqueSlug = async (text, excludeId = null) => {
    let baseSlug = slugify(text);
    if (!baseSlug) {
        baseSlug = 'product';
    }

    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await Product.findOne(query).select('_id').lean();
        if (!existing) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
};
