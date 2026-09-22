const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/core/db');
const { runWithAuditContext } = require('./src/modules/audit/auditContext');
// Morgan import removed

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Audit context: wraps every request in an AsyncLocalStorage scope
// so Mongoose hooks can access req.user/ip without controller coupling.
app.use((req, res, next) => {
  runWithAuditContext({ user: null, ip: req.ip }, next);
});

// Body parser
app.use(express.json());

// ─── Logging ────────────────────────────────────────────────────────────────
// ANSI color helpers (work in Render logs and local terminals)
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

const log = {
  info:    (msg) => console.log(`${c.cyan}[INFO]${c.reset}  ${msg}`),
  success: (msg) => console.log(`${c.green}[OK]${c.reset}    ${msg}`),
  warn:    (msg) => console.warn(`${c.yellow}[WARN]${c.reset}  ${msg}`),
  error:   (msg) => console.error(`${c.red}[ERROR]${c.reset} ${msg}`),
  event:   (msg) => console.log(`${c.magenta}[EVENT]${c.reset} ${msg}`),
};

// Morgan logging removed – using basic console logs

// Cookie parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Enable CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL, // Vercel frontend URL (set in Render env vars)
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true
}));

// Route files
const authRoutes = require('./src/modules/auth/authRoutes');
const productRoutes = require('./src/modules/catalog/productRoutes');
const inventoryRoutes = require('./src/modules/inventory/inventoryRoutes');
const dashboardRoutes = require('./src/modules/sales/dashboardRoutes');
const warehouseRoutes = require('./src/modules/inventory/warehouseRoutes');
const customerRoutes = require('./src/modules/sales/customerRoutes');
const saleRoutes = require('./src/modules/sales/saleRoutes');
const adminRoutes = require('./src/modules/platform/adminRoutes');
const superAdminRoutes = require('./src/modules/platform/platformRoutes');
const uploadRoutes = require('./src/modules/upload/uploadRoutes');
const procurementRoutes = require('./src/modules/procurement/procurementRoutes');
const auditRoutes = require('./src/modules/audit/auditRoutes');

const { errorHandler } = require('./src/core/middlewares/errorMiddleware');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint (API)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Backend is healthy' });
});

// Root health check endpoint (Useful for keeping Render awake via UptimeRobot)
app.get('/', (req, res) => {
  res.status(200).send('Inventory Management Server is Awake!');
});
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Register error middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  const divider = `${c.dim}${'─'.repeat(52)}${c.reset}`;
  console.log('');
  console.log(divider);
  console.log(`  ${c.bold}${c.cyan}🚀 Stockora Backend${c.reset}`);
  console.log(divider);
  log.success(`Server started on port ${c.bold}${PORT}${c.reset}`);
  log.info(`Environment  : ${c.bold}${ENV}${c.reset}`);
  log.info(`Started at   : ${c.bold}${new Date().toLocaleString()}${c.reset}`);
  log.info(`Health check : ${c.bold}http://localhost:${PORT}/api/health${c.reset}`);
  if (allowedOrigins.length) {
    log.info(`CORS origins :`);
    allowedOrigins.forEach(o => console.log(`             ${c.dim}↳${c.reset} ${o}`));
  }
  console.log(divider);
  console.log('');
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  log.error(`Unhandled Promise Rejection: ${err.message}`);
  log.warn('Shutting down server gracefully...');
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
  log.warn('Shutting down server immediately...');
  process.exit(1);
});
