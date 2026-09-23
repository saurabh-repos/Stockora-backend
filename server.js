const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Load env vars first so logger can read NODE_ENV
dotenv.config();

const logger = require('./src/core/utils/logger');
const connectDB = require('./src/core/db');
const { runWithAuditContext } = require('./src/modules/audit/auditContext');

// Connect to database
connectDB();

const app = express();

// ─── Audit Context ───────────────────────────────────────────────────────────
// Wraps every request in an AsyncLocalStorage scope so Mongoose hooks can
// access req.user/ip without controller coupling.
app.use((req, res, next) => {
  runWithAuditContext({ user: null, ip: req.ip }, next);
});

// ─── Body / Cookie Parsers ───────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ─── CORS – allow all origins ────────────────────────────────────────────────
app.use(cors({
  origin: true,      // reflects the request origin, allowing any domain
  credentials: true, // allow cookies / Authorization headers
}));

// ─── HTTP Request Logging (Morgan → Winston) ─────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: logger.stream }));

// ─── Route files ─────────────────────────────────────────────────────────────
const authRoutes        = require('./src/modules/auth/authRoutes');
const productRoutes     = require('./src/modules/catalog/productRoutes');
const inventoryRoutes   = require('./src/modules/inventory/inventoryRoutes');
const dashboardRoutes   = require('./src/modules/sales/dashboardRoutes');
const warehouseRoutes   = require('./src/modules/inventory/warehouseRoutes');
const customerRoutes    = require('./src/modules/sales/customerRoutes');
const saleRoutes        = require('./src/modules/sales/saleRoutes');
const adminRoutes       = require('./src/modules/platform/adminRoutes');
const superAdminRoutes  = require('./src/modules/platform/platformRoutes');
const uploadRoutes      = require('./src/modules/upload/uploadRoutes');
const procurementRoutes = require('./src/modules/procurement/procurementRoutes');
const auditRoutes       = require('./src/modules/audit/auditRoutes');
const shiftRoutes       = require('./src/modules/sales/shiftRoutes');

const { errorHandler } = require('./src/core/middlewares/errorMiddleware');

// ─── Mount Routers ────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/inventory',   inventoryRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/warehouses',  warehouseRoutes);
app.use('/api/customers',   customerRoutes);
app.use('/api/sales',       saleRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/superadmin',  superAdminRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/audit-logs',  auditRoutes);
app.use('/api/shifts',      shiftRoutes);

// ─── Health Checks ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Backend is healthy' });
});

// Root health check (keeps Render awake via UptimeRobot)
app.get('/', (req, res) => res.status(200).send('Stockora Backend is Awake!'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── Error Middleware (must be last) ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const ENV  = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  const divider = '─'.repeat(52);
  logger.info('');
  logger.info(divider);
  logger.info('  🚀  Stockora Backend');
  logger.info(divider);
  logger.info(`Server   : ${HOST}`);
  logger.info(`Env      : ${ENV}`);
  logger.info(`Health   : ${HOST}/api/health`);
  logger.info(`CORS     : All origins allowed`);
  logger.info(`Logs     : ./logs/stockora-<date>.log`);
  logger.info(divider);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, { stack: err.stack });
  logger.warn('Shutting down server gracefully...');
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  logger.warn('Shutting down server immediately...');
  process.exit(1);
});
