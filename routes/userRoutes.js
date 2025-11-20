import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import Task from "../models/Task.js";
import SavedTask from "../models/savedTask.js";


const router = express.Router();

// ========================
// 📸 MULTER CONFIGURATION
// ========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/avatars";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const isValid =
      allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) cb(null, true);
    else cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed!"));
  },
});

// ========================
// ✅ GET USER PROFILE
// ========================
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ========================
// ✅ UPDATE USER PROFILE
// ========================
router.put("/profile", auth, upload.single("profileImage"), async (req, res) => {
  try {
    const updates = { ...req.body };

    // If a new image is uploaded
    if (req.file) {
      updates.profileImage = req.file.filename;

      // Delete old image if exists
      const oldUser = await User.findById(req.user.id);
      if (oldUser?.profileImage) {
        const oldPath = path.join("uploads/avatars", oldUser.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlink(oldPath, (err) => {
            if (err) console.warn("⚠️ Could not delete old profile image:", err);
          });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ User statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const clientId = req.user._id;
    const userId = req.user._id;

    // Count all tasks created by this user
    const totalTasks = await Task.countDocuments({ clientId });

    // Count all saved jobs
    const savedJobs = await SavedTask.countDocuments({ userId });

    // Calculate account age
    const joinedDate = req.user.createdAt;
    const daysOnPlatform = Math.floor(
      (Date.now() - new Date(joinedDate)) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      stats: {
        totalTasks,
        savedJobs,
        daysOnPlatform,
        joined: joinedDate,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching stats: " + error.message,
    });
  }
});


export default router;
