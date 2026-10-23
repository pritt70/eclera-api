import mongoose from 'mongoose';
import Policy from './model.js';
import {
    validateCreate,
    validateUpdate,
    validateChangeStatus,
} from './helper/validation.js';

// Predefined initial seed policies if database is empty
const defaultPolicies = [
    {
        title: 'Shipping Policy',
        slug: 'shipping-policy',
        type: 'shipping',
        sortOrder: 1,
        summary: 'Standard delivery in 3-5 business days. Free shipping on all prepaid orders above ₹499 across India.',
        content: `### 1. Order Processing Time
All orders placed on **Eclera Cosmetics** are processed within 24 to 48 business hours (excluding Sundays and national holidays). Once your order is dispatched, you will receive an SMS and email notification with an active tracking link.

### 2. Shipping Charges & Delivery Timelines
* **Standard Delivery:** 3 - 5 business days for metro cities, 5 - 7 business days for regional/remote areas.
* **Shipping Rates:**
  * **Free Shipping:** Applicable on all orders totaling ₹499 or above.
  * **Flat Delivery Fee:** A nominal delivery charge of ₹50 is applied on orders below ₹499.
  * **Cash on Delivery (COD):** Available for select pin codes with a convenience fee of ₹40.

### 3. Courier Partners
We partner with leading, verified logistics carriers including BlueDart, Delhivery, Xpressbees, and DTDC to ensure timely and temperature-sensitive handling of our skincare and cosmetics products.

### 4. Tracking Your Order
You can track the real-time journey of your package through the **Track Order** link sent via SMS/Email, or from your **My Account** section.

### 5. Damaged or Tampered Packages
If you receive a package that appears damaged, opened, or tampered with, please do not accept the delivery. Capture clear photos/videos and immediately contact our customer support team at **support@eclera.com** within 24 hours.`,
        status: 'active',
    },
    {
        title: 'Return & Refund Policy',
        slug: 'return-policy',
        type: 'return',
        sortOrder: 2,
        summary: '7-day replacement or refund for damaged, missing, or defective items with verified proof.',
        content: `### 1. Return Window
At **Eclera**, customer satisfaction and safety are our highest priorities. We offer a **7-Day Return/Replacement Window** from the date of confirmed delivery for eligible cases.

### 2. Eligibility for Returns & Exchanges
Given the personal and hygienic nature of cosmetics and skincare products, returns are accepted under the following conditions:
* You received a damaged or leaking product.
* The item delivered is expired, defective, or incorrect (different variant/shade).
* An item is missing from the delivered package.
* **Condition:** Items must be in their original packaging, unused, unwashed, and with all protective seals intact.

### 3. Non-Returnable Items
* Opened, swatched, or partially used skincare and cosmetic items cannot be returned due to hygiene protocols.
* Clearance, sale, or promotional gift items unless damaged during transit.

### 4. Refund Process
* Once your return request is approved and the product is inspected at our fulfillment center, refunds will be processed within **5 to 7 business days**.
* **Prepaid Orders:** Refund will be credited directly to the original payment source (Credit/Debit Card, UPI, NetBanking).
* **Cash on Delivery Orders:** Refund will be transferred via NEFT/UPI after customer provides bank details.

### 5. How to Initiate a Return
Email us at **returns@eclera.com** or message our WhatsApp Helpdesk with your Order ID, clear photos of the outer box, invoice, and the affected item.`,
        status: 'active',
    },
    {
        title: 'Terms & Conditions',
        slug: 'terms-and-conditions',
        type: 'terms',
        sortOrder: 3,
        summary: 'General terms and conditions for browsing, purchasing, and interacting with Eclera Cosmetics.',
        content: `### 1. Introduction
Welcome to **Eclera Cosmetics** (referred to as "we", "us", or "our"). By accessing or making purchases on our website, you agree to comply with and be bound by the following Terms & Conditions.

### 2. Account Registration & Security
* To access certain features or purchase products, you may need to register an account.
* You are responsible for safeguarding your login credentials and for all activities conducted under your account.

### 3. Product Information & Pricing
* We strive to present our skincare formulations, shades, ingredients, and packaging as accurately as possible. However, individual screen calibrations may slightly alter color perception.
* Prices listed on the website are in Indian Rupees (INR) inclusive of applicable GST taxes.
* Eclera reserves the right to update product prices, specifications, or discontinue products at any time without prior notice.

### 4. Intellectual Property
All content including logos, graphics, text, images, product names, and design layouts are the exclusive property of Eclera Cosmetics and are protected under international trademark and copyright laws.

### 5. Patch Test Disclaimer
While all our formulations are dermatologically tested, skin types vary. We strongly recommend conducting a 24-hour patch test before full application of any new skincare formulation.

### 6. Governing Law
These Terms of Service and any separate agreements shall be governed by and construed in accordance with the laws of India, under the jurisdiction of Ahmedabad, Gujarat.`,
        status: 'active',
    },
    {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        type: 'privacy',
        sortOrder: 4,
        summary: 'How Eclera protects your personal information, encrypted payments, and browsing preferences.',
        content: `### 1. Information We Collect
We collect necessary personal information to process your orders seamlessly, including:
* Full name, shipping address, billing address, and contact phone number.
* Email address for order status, invoices, and newsletter updates (optional).
* Device information, IP address, and browser cookies to personalize your shopping experience.

### 2. Payment Security
Eclera does **NOT** store your credit/debit card numbers, CVVs, or NetBanking passwords. All financial transactions are securely processed through PCI-DSS Level 1 certified payment gateways with 256-bit SSL encryption.

### 3. How We Use Your Data
* To process, pack, and deliver your orders.
* To communicate order tracking, cancellations, and customer support inquiries.
* To send relevant product announcements or exclusive offers (you may unsubscribe at any time).

### 4. Zero Data Selling
We respect your privacy. Eclera does not sell, rent, or trade your personal information to third-party advertisers or marketers.

### 5. Contact Us
For any privacy-related queries or to request data removal, please contact our Data Protection Officer at **privacy@eclera.com**.`,
        status: 'active',
    },
];

/**
 * Helper to ensure default policies exist
 */
const ensureDefaultPolicies = async () => {
    try {
        const count = await Policy.countDocuments();
        if (count === 0) {
            console.log('[Policy Module] Initializing default policies in database...');
            await Policy.insertMany(defaultPolicies);
            console.log('[Policy Module] Default policies seeded successfully.');
        }
    } catch (err) {
        console.error('[Policy Module] Error seeding default policies:', err.message);
    }
};

/**
 * Convert string to URL-safe slug
 */
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

/**
 * List all policies with pagination, search, status, and type filter
 */
export const list = async (req, res) => {
    try {
        await ensureDefaultPolicies();

        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 20, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim();
        const type = (req.body?.type || req.query?.type || '').trim();

        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { slug: { $regex: escaped, $options: 'i' } },
                { summary: { $regex: escaped, $options: 'i' } },
                { content: { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [policies, total] = await Promise.all([
            Policy.find(query)
                .sort({ sortOrder: 1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Policy.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Policies retrieved successfully',
            data: {
                policies,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching policies list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policies',
            error: error.message,
        });
    }
};

/**
 * Get policy by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const policy = await Policy.findById(id).lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy document not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching policy by ID:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policy',
            error: error.message,
        });
    }
};

/**
 * Get policy by slug (Admin / Internal)
 */
export const getBySlug = async (req, res) => {
    try {
        const slug = (req.params.slug || req.body?.slug || req.query?.slug || '').trim().toLowerCase();

        if (!slug) {
            return res.status(400).json({
                status: false,
                message: 'Policy slug is required',
            });
        }

        const policy = await Policy.findOne({ slug }).lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: `Policy '${slug}' not found`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching policy by slug:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policy',
            error: error.message,
        });
    }
};

/**
 * Create a new policy
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
                details: error.details.map((d) => d.message),
            });
        }

        const slug = value.slug ? slugify(value.slug) : slugify(value.title);

        // Check for existing slug
        const existing = await Policy.findOne({ slug });
        if (existing) {
            return res.status(409).json({
                status: false,
                message: `A policy with slug "${slug}" already exists`,
            });
        }

        const newPolicy = new Policy({
            title: value.title,
            slug,
            type: value.type || 'custom',
            summary: value.summary || '',
            content: value.content,
            status: value.status || 'active',
            sortOrder: value.sortOrder || 0,
            updatedBy: req.admin?.name || 'Admin',
        });

        await newPolicy.save();

        return res.status(201).json({
            status: true,
            message: 'Policy created successfully',
            data: newPolicy,
        });
    } catch (error) {
        console.error('Error creating policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to create policy',
            error: error.message,
        });
    }
};

/**
 * Update policy
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.body?._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
                details: error.details.map((d) => d.message),
            });
        }

        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found',
            });
        }

        if (value.slug && value.slug !== policy.slug) {
            const formattedSlug = slugify(value.slug);
            const duplicate = await Policy.findOne({ slug: formattedSlug, _id: { $ne: id } });
            if (duplicate) {
                return res.status(409).json({
                    status: false,
                    message: `A policy with slug "${formattedSlug}" already exists`,
                });
            }
            policy.slug = formattedSlug;
        }

        if (value.title !== undefined) policy.title = value.title;
        if (value.type !== undefined) policy.type = value.type;
        if (value.summary !== undefined) policy.summary = value.summary;
        if (value.content !== undefined) policy.content = value.content;
        if (value.status !== undefined) policy.status = value.status;
        if (value.sortOrder !== undefined) policy.sortOrder = value.sortOrder;
        policy.updatedBy = req.admin?.name || 'Admin';

        await policy.save();

        return res.status(200).json({
            status: true,
            message: 'Policy updated successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error updating policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update policy',
            error: error.message,
        });
    }
};

/**
 * Toggle active / inactive status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.body?.id || req.query?.id;
        const status = req.body?.status || req.query?.status;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const { error } = validateChangeStatus({ status });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        const policy = await Policy.findByIdAndUpdate(
            id,
            { status, updatedBy: req.admin?.name || 'Admin' },
            { new: true }
        );

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Policy status changed to ${status}`,
            data: policy,
        });
    } catch (error) {
        console.error('Error toggling policy status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update policy status',
            error: error.message,
        });
    }
};

/**
 * Delete policy
 */
export const deletePolicy = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const deleted = await Policy.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found or already deleted',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy deleted successfully',
            data: { id: deleted._id, title: deleted.title },
        });
    } catch (error) {
        console.error('Error deleting policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete policy',
            error: error.message,
        });
    }
};

/**
 * PUBLIC WEBSITE API: Get all active policies
 */
export const getPublicPolicies = async (req, res) => {
    try {
        await ensureDefaultPolicies();

        const policies = await Policy.find({ status: 'active' })
            .select('title slug type summary content updatedAt')
            .sort({ sortOrder: 1, updatedAt: -1 })
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Active policies retrieved successfully',
            data: policies,
        });
    } catch (error) {
        console.error('Error fetching public policies:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch policies',
            error: error.message,
        });
    }
};

/**
 * PUBLIC WEBSITE API: Get single policy by slug
 */
export const getPublicPolicyBySlug = async (req, res) => {
    try {
        await ensureDefaultPolicies();

        const slug = (req.params.slug || req.query.slug || '').trim().toLowerCase();

        if (!slug) {
            return res.status(400).json({
                status: false,
                message: 'Policy slug is required',
            });
        }

        const policy = await Policy.findOne({ slug, status: 'active' })
            .select('title slug type summary content updatedAt')
            .lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: `Policy '${slug}' not found or currently inactive`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching public policy by slug:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch policy',
            error: error.message,
        });
    }
};
