/**
 * auditPlugin.js
 *
 * A Mongoose plugin that auto-logs all document-level CRUD operations.
 * Apply this to any model you want audited. The plugin uses AsyncLocalStorage
 * to read the current request's user/IP without any controller coupling.
 *
 * Industry-standard pattern: model-level hooks + request-scoped context store.
 */
const { getAuditContext } = require('./auditContext');
const AuditLog = require('./AuditLog');

// Map model names to their audit action prefixes
const MODEL_PREFIX = {
  Product:       'PRODUCT',
  User:          'USER',
  Sale:          'SALE',
  Customer:      'CUSTOMER',
  Supplier:      'SUPPLIER',
  PurchaseOrder: 'PO',
};

/**
 * Determine the right action string based on the model, whether it's new,
 * and which fields were modified.
 */
const resolveAction = (modelName, wasNew, modifiedPaths, doc) => {
  const prefix = MODEL_PREFIX[modelName] || modelName.toUpperCase();

  if (wasNew) return `CREATE_${prefix}`;

  // Special cases for User model
  if (modelName === 'User') {
    if (modifiedPaths.includes('password')) return 'RESET_PASSWORD';
    if (modifiedPaths.includes('isActive')) {
      return doc.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER';
    }
  }

  // Special case for PurchaseOrder receive
  if (modelName === 'PurchaseOrder' && modifiedPaths.includes('status') && doc.status === 'Received') {
    return 'RECEIVE_PO';
  }

  return `UPDATE_${prefix}`;
};

/**
 * Build a concise details object for the log entry.
 */
const resolveDetails = (modelName, doc) => {
  switch (modelName) {
    case 'Product':
      return { name: doc.name, sku: doc.sku };
    case 'User':
      return { name: doc.name, email: doc.email, role: doc.role };
    case 'Sale':
      return { invoiceNumber: doc.invoiceNumber, grandTotal: doc.grandTotal };
    case 'Customer':
      return { name: doc.name, phone: doc.phone };
    case 'Supplier':
      return { name: doc.name, email: doc.email };
    case 'PurchaseOrder':
      return { poNumber: doc.poNumber, totalAmount: doc.totalAmount, status: doc.status };
    default:
      return {};
  }
};

/**
 * The Mongoose plugin function. Attach to a schema with:
 *   schema.plugin(auditPlugin);
 */
const auditPlugin = (schema, options = {}) => {
  // Capture isNew and modified paths BEFORE save (they're unavailable in post)
  schema.pre('save', function () {
    this.$locals.wasNew = this.isNew;
    this.$locals.modifiedPaths = this.modifiedPaths();
  });

  // After a successful save, write the audit log
  schema.post('save', async function (doc) {
    try {
      console.log('[AuditPlugin] post-save hook triggered for model:', doc.constructor.modelName);
      const ctx = getAuditContext();
      console.log('[AuditPlugin] Context:', ctx);
      
      const modelName = doc.constructor.modelName;

      const action = resolveAction(
        modelName,
        this.$locals.wasNew,
        this.$locals.modifiedPaths || [],
        doc
      );
      console.log('[AuditPlugin] Action resolved:', action, 'Modified paths:', this.$locals.modifiedPaths);

      const log = await AuditLog.create({
        shop: doc.shop || ctx?.user?.shop,
        user: ctx?.user?._id || null,
        userName: ctx?.user?.name || 'System',
        action,
        entityType: modelName,
        entityId: doc._id,
        details: resolveDetails(modelName, doc),
        ipAddress: ctx?.ip,
      });
      console.log('[AuditPlugin] Log created successfully:', log._id);
    } catch (err) {
      // Non-critical: never crash the request
      console.error('[AuditPlugin] post-save log failed:', err.message, err);
    }
  });

  // After a document-level deleteOne(), write a delete log
  schema.post('deleteOne', { document: true, query: false }, async function (doc) {
    try {
      const ctx = getAuditContext();
      const modelName = this.constructor.modelName;
      const prefix = MODEL_PREFIX[modelName] || modelName.toUpperCase();

      await AuditLog.create({
        shop: this.shop || ctx?.user?.shop,
        user: ctx?.user?._id || null,
        userName: ctx?.user?.name || 'System',
        action: `DELETE_${prefix}`,
        entityType: modelName,
        entityId: this._id,
        details: resolveDetails(modelName, this),
        ipAddress: ctx?.ip,
      });
    } catch (err) {
      console.error('[AuditPlugin] post-delete log failed:', err.message);
    }
  });
};

module.exports = auditPlugin;
