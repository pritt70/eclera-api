import mongoose from 'mongoose';

// -------------------------------------------------------------
// 1. Specification Option Schema (specification_options)
// -------------------------------------------------------------
const specificationOptionSchema = new mongoose.Schema(
    {
        specification_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specification',
            required: [true, 'Specification ID is required'],
        },
        name: {
            type: String,
            required: [true, 'Option name is required'],
            trim: true,
        },
        sort_order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'specification_options',
    }
);

// Unique on (specification_id, lower(trim(name))) via collation
specificationOptionSchema.index(
    { specification_id: 1, name: 1 },
    {
        unique: true,
        collation: { locale: 'en', strength: 2 },
    }
);
specificationOptionSchema.index({ specification_id: 1, sort_order: 1 });

// -------------------------------------------------------------
// 2. Specification Schema (specifications)
// -------------------------------------------------------------
const specificationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Specification name is required'],
            trim: true,
        },
        display_name: {
            type: String,
            trim: true,
            default: function () {
                return this.name;
            },
        },
        // Alias for UI backwards compatibility
        displayName: {
            type: String,
            trim: true,
            default: '',
        },
        slug: {
            type: String,
            required: [true, 'Specification slug is required'],
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        is_veriant: {
            type: Boolean,
            default: false,
        },
        is_variant: {
            type: Boolean,
            default: false,
        },
        // UI compatibility status
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            trim: true,
        },
        sort_order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'specifications',
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual populate for options from specification_options collection
specificationSchema.virtual('options', {
    ref: 'SpecificationOption',
    localField: '_id',
    foreignField: 'specification_id',
});

// Sync display_name and is_active with UI fields before save
specificationSchema.pre('save', function () {
    if (!this.display_name && this.name) {
        this.display_name = this.name;
    }
    if (this.displayName) {
        this.display_name = this.displayName;
    } else if (this.display_name) {
        this.displayName = this.display_name;
    }

    if (this.status) {
        this.is_active = this.status === 'active';
    } else {
        this.status = this.is_active ? 'active' : 'inactive';
    }
});

// Cascade delete options when specification is deleted
specificationSchema.pre('findOneAndDelete', async function () {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
        await mongoose.model('SpecificationOption').deleteMany({ specification_id: doc._id });
    }
});

specificationSchema.pre('deleteOne', { document: true, query: false }, async function () {
    await mongoose.model('SpecificationOption').deleteMany({ specification_id: this._id });
});

// Indexes:
// 1. Unique slug
specificationSchema.index({ slug: 1 }, { unique: true });
// 2. Name unique ignoring case and extra spaces via collation
specificationSchema.index(
    { name: 1 },
    {
        unique: true,
        collation: { locale: 'en', strength: 2 },
    }
);
// 3. Index on is_active
specificationSchema.index({ is_active: 1 });
specificationSchema.index({ status: 1 });

export const SpecificationOption =
    mongoose.models.SpecificationOption ||
    mongoose.model('SpecificationOption', specificationOptionSchema);

export const Specification =
    mongoose.models.Specification ||
    mongoose.model('Specification', specificationSchema);

export default Specification;
