/**
 * auditContext.js
 *
 * Uses Node.js AsyncLocalStorage to propagate request context (user, IP)
 * into Mongoose model hooks without having to pass it manually to every controller.
 *
 * This is the industry-standard approach for request-scoped context in Node.js.
 */
const { AsyncLocalStorage } = require('async_hooks');

const auditStorage = new AsyncLocalStorage();

/**
 * Returns the current request's audit context { user, ip } from the async scope.
 * Returns undefined if called outside of a request (e.g. seeder scripts).
 */
const getAuditContext = () => auditStorage.getStore();

/**
 * Wraps `fn` in a new async storage scope, seeding it with `context`.
 * Call this from a middleware so all downstream async code inherits the context.
 */
const runWithAuditContext = (context, fn) => auditStorage.run(context, fn);

module.exports = { getAuditContext, runWithAuditContext };
