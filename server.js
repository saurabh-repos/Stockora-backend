const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/core/db');
const { runWithAuditContext } = require('./src/modules/audit/auditContext');

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

// Cookie parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Frontend URLs
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Backend is healthy' });
});

// Register error middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
