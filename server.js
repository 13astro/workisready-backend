import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import savedTasks from "./routes/savedTasks.js";
import userRoutes from "./routes/userRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import savedWorkerRoutes from "./routes/savedWorkerRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";


// Load environment variables
dotenv.config();

const app = express();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/uploads/tasks", express.static(path.join(__dirname, "uploads/tasks")));
app.use("/uploads/avatars", express.static(path.join(__dirname, "uploads/avatars")));
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/saved-tasks", savedTasks);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/saved-workers", savedWorkerRoutes);
app.use("/api/reviews", reviewRoutes);


// Basic route
app.get("/", (req, res) => {
  res.json({ 
    message: "WorkisReady Backend API is running 🚀",
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// 404 handler - FIXED: Proper wildcard route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/workisready";

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});