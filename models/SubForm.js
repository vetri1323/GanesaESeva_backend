import mongoose from 'mongoose';

const subFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique sub-form names per form
subFormSchema.index({ name: 1, formId: 1 }, { unique: true });

// Update the updatedAt field on save
subFormSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field on update operations
subFormSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export default mongoose.model('SubForm', subFormSchema);
