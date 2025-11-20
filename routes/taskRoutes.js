import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Task from "../models/Task.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/tasks/"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "task-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ---------- ROUTES ----------

// ✅ GET user’s tasks
router.get("/user/my-tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ clientId: req.user.id })
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });

    console.log(`✅ Retrieved user tasks for ${req.user.email}: ${tasks.length}`);
    res.json({ success: true, tasks });
  } catch (error) {
    console.error("❌ Error fetching user tasks:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ POST new task
router.post("/", auth, upload.array("images", 5), async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      dueDate,
      minBudget,
      maxBudget,
      phone,
      additionalContact,
    } = req.body;

    if (!title || !category || !description || !location || !dueDate || !phone) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const imagePaths = req.files ? req.files.map((file) => file.filename) : [];

    const task = new Task({
      title,
      category,
      description,
      location,
      dueDate: new Date(dueDate),
      budget: { min: +minBudget || 0, max: +maxBudget || 0 },
      contact: { phone, additionalContact },
      images: imagePaths,
      clientId: req.user.id,
    });

    await task.save();
    res.status(201).json({ success: true, message: "Task created", task });
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ SEARCH route (must come before /:id)
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";

    const tasks = await Task.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ],
    }).select("title category description _id location budget");

    res.json({ success: true, tasks });
  } catch (error) {
    console.error("❌ Service search error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// ✅ UPDATE task by ID (with image removal and uploads)
router.put("/:id", auth, upload.array("newImages", 5), async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Only the owner can edit
    if (task.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized to edit this task" });
    }

    // ✅ Parse data from FormData
    const {
      title,
      category,
      description,
      location,
      dueDate,
      budget,
      contact,
      existingImages,
    } = req.body;

    // Parse JSON strings safely
    const parsedBudget = budget ? JSON.parse(budget) : {};
    const parsedContact = contact ? JSON.parse(contact) : {};
    const parsedExistingImages = existingImages ? JSON.parse(existingImages) : [];

    // ✅ Handle image removal — delete files no longer in the list
    const fs = await import("fs/promises");
    const removedImages = task.images.filter((img) => !parsedExistingImages.includes(img));

    for (const img of removedImages) {
      const imgPath = path.join(__dirname, "../uploads/tasks", img);
      try {
        await fs.unlink(imgPath);
        console.log("🗑️ Deleted old image:", img);
      } catch (err) {
        console.warn("⚠️ Failed to delete image:", img, err.message);
      }
    }

    // ✅ Add new uploaded images
    const newUploadedImages = req.files ? req.files.map((file) => file.filename) : [];

    // ✅ Update fields
    task.title = title || task.title;
    task.category = category || task.category;
    task.description = description || task.description;
    task.location = location || task.location;
    task.dueDate = dueDate ? new Date(dueDate) : task.dueDate;
    task.budget = {
      min: parsedBudget.min || task.budget.min,
      max: parsedBudget.max || task.budget.max,
    };
    task.contact = {
      phone: parsedContact.phone || task.contact.phone,
      additionalContact:
        parsedContact.additionalContact || task.contact.additionalContact,
    };

    // ✅ Update image array (existing + new)
    task.images = [...parsedExistingImages, ...newUploadedImages];

    const updatedTask = await task.save();

    console.log("✅ Task updated successfully:", updatedTask._id);
    res.json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
});



// ✅ DELETE task by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Ensure the logged-in user owns the task
    if (task.clientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this task" });
    }

    await task.deleteOne();
    console.log("🗑️ Task deleted:", taskId);

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ GET all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().populate("clientId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ GET task by ID (keep LAST)
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate("clientId", "name email phone");
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, task });
  } catch (error) {
    console.error("❌ Error fetching task:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

export default router;
