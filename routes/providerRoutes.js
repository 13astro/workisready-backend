import express from "express";
import multer from "multer";
import Provider from "../models/Providers.js";
import { auth } from "../middleware/auth.js";
import path from "path";
import fs from "fs";

const router = express.Router();

// ✅ Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/providers";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

/* -------------------------------------------------------------------------- */
/* 🟢 REGISTER PROVIDER (Only Once) */
/* -------------------------------------------------------------------------- */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
    { name: "sampleWork", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user._id;

      // ✅ Check if user already registered
      const existingProvider = await Provider.findOne({ userId });
      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: "You have already registered as a provider.",
        });
      }

      const {
        fullName,
        category,
        location,
        contact,
        email,
        bio,
        organizationType,
        skills,
        paymentMethods,
      } = req.body;

      const provider = new Provider({
        userId,
        fullName,
        category,
        location,
        contact,
        email,
        bio,
        organizationType,
        skills: JSON.parse(skills || "[]"),
        paymentMethods: JSON.parse(paymentMethods || "[]"),
        profilePic: req.files?.profilePic?.[0]?.path || "",
        idCard: req.files?.idCard?.[0]?.path || "",
        sampleWork: req.files?.sampleWork?.map((f) => f.path) || [],
      });

      await provider.save();

      res.status(201).json({
        success: true,
        message: "Provider registration submitted successfully!",
        provider,
      });
    } catch (error) {
      console.error("❌ Error registering provider:", error);
      res.status(500).json({
        success: false,
        message: "Server error during provider registration: " + error.message,
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* 🟡 CHECK PROVIDER REGISTRATION */
/* -------------------------------------------------------------------------- */
router.get("/check", auth, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    res.json({
      success: true,
      exists: !!provider,
      provider,
    });
  } catch (error) {
    console.error("❌ Error checking provider registration:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟣 GET ALL PROVIDERS */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find().sort({ createdAt: -1 });
    res.json({ success: true, providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟠 FETCH CURRENT PROVIDER INFO */
/* -------------------------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    }
    res.json({ success: true, provider });
  } catch (error) {
    console.error("❌ Error fetching provider:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔍 SEARCH PROVIDERS BY NAME, CATEGORY OR SKILLS */
/* -------------------------------------------------------------------------- */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q) {
      return res.json({ success: true, providers: [] });
    }

    // Case-insensitive partial match for name, category, or skills
    const providers = await Provider.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { skills: { $elemMatch: { $regex: q, $options: "i" } } },
      ],
    }).select("fullName category skills profilePic _id");

    res.json({ success: true, providers });
  } catch (error) {
    console.error("❌ Error searching providers:", error);
    res.status(500).json({ success: false, message: "Server error during search" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔵 GET SINGLE PROVIDER BY ID */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }
    res.json({ success: true, provider });
  } catch (error) {
    console.error("❌ Error fetching provider:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});





/* -------------------------------------------------------------------------- */
/* 🔴 UPDATE PROVIDER INFO */
/* -------------------------------------------------------------------------- */
router.put(
  "/update",
  auth,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
    { name: "sampleWork", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (!provider) {
        return res
          .status(404)
          .json({ success: false, message: "Provider not found" });
      }

      const updates = req.body;
      if (updates.skills) updates.skills = JSON.parse(updates.skills);
      if (updates.paymentMethods)
        updates.paymentMethods = JSON.parse(updates.paymentMethods);

      // File updates
      // ✅ Replace profile picture safely
if (req.files?.profilePic?.[0]) {
  // Delete old file if exists
  if (provider.profilePic && fs.existsSync(provider.profilePic)) {
    fs.unlinkSync(provider.profilePic);
  }

  provider.profilePic = req.files.profilePic[0].path;
}

      if (req.files?.idCard?.[0]) {
        provider.idCard = req.files.idCard[0].path;
      }
      if (req.files?.sampleWork) {
        provider.sampleWork.push(...req.files.sampleWork.map((f) => f.path));
      }

      Object.assign(provider, updates);

      await provider.save();

      res.json({
        success: true,
        message: "Provider updated successfully!",
        provider,
      });
    } catch (error) {
      console.error("❌ Error updating provider:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating provider: " + error.message,
      });
    }
  }
);


// -------------------------------------------------------------------------------
// // POST: Add a review
// ---------------------------------------------------------------------------------
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.json({ success: false, message: "Provider not found" });
    }

    // Prevent duplicate review by same user
    const alreadyReviewed = provider.reviews.find(
  (r) => r.userId.toString() === req.user._id.toString()
);


    if (alreadyReviewed) {
      return res.json({
        success: false,
        message: "You already reviewed this provider",
      });
    }

    const review = {
      userId: req.user.id,
      name: req.user.email, // email since WorkisReady shows only email
      rating,
      comment,
    };

    provider.reviews.push(review);
    provider.calculateRating();
    await provider.save();

    res.json({ success: true, message: "Review added", provider });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error adding review" });
  }
});


export default router;
