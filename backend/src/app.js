const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoute');
const quoteRoutes = require('./routes/quoteRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerRoutes = require('./routes/customerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());

// Scoped to exactly this path, and registered before the global
// express.json() below, so it captures the raw request bytes into
// req.rawBody -- webhookController's signature check needs the exact bytes
// Meta signed, not a re-serialized copy of the parsed object. body-parser
// (which express.json wraps) marks the request as already-parsed, so the
// global express.json() further down safely skips re-reading this route's
// already-consumed stream instead of double-parsing it.
app.use('/api/whatsapp/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
