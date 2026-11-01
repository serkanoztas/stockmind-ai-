import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.router';
import { categoryRouter } from './modules/categories/category.router';
import { productRouter } from './modules/products/product.router';
import { inventoryRouter } from './modules/inventory/inventory.router';
import { salesRouter } from './modules/sales/sales.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { aiRouter } from './modules/ai/ai.router';
import { errorHandler } from './middleware/error.middleware';


export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/ai', aiRouter);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use(errorHandler);