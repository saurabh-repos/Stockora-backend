const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true,
      // e.g. USER_LOGIN, CREATE_PRODUCT, DELETE_PRODUCT, CREATE_SALE, RECEIVE_PO, etc.
    },
    entityType: {
      type: String,
      // e.g. 'Product', 'Sale', 'PurchaseOrder', 'User'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
// Prevent modification or deletion of audit logs (Immutability)
const throwImmutableError = async function () {
  throw new Error('Audit logs are immutable and cannot be modified or deleted.');
};

auditLogSchema.pre('updateOne', throwImmutableError);
auditLogSchema.pre('updateMany', throwImmutableError);
auditLogSchema.pre('findOneAndUpdate', throwImmutableError);
auditLogSchema.pre('deleteOne', { document: true, query: true }, throwImmutableError);
auditLogSchema.pre('deleteMany', throwImmutableError);
auditLogSchema.pre('findOneAndDelete', throwImmutableError);
auditLogSchema.pre('save', async function () {
  if (!this.isNew) {
    throw new Error('Audit logs are immutable and cannot be modified.');
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
