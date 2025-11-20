import express from "express";
import { auth } from "../middleware/auth.js";
import SavedProvider from "../models/SavedProvider.js";
import Provider from "../models/Providers.js";

const router = express.Router();

// ✅ Get all saved providers for current user
router.get("/", auth, async (req, res) => {
  try {
    const saved = await SavedProvider.find({ userId: req.user._id })
      .populate("providerId")
      .lean();

    res.json({
      success: true,
      savedProviders: saved.map((item) => item.providerId),
    });
  } catch (err) {
    console.error("❌ Error fetching saved workers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Save a provider
router.post("/:id", auth, async (req, res) => {
  try {
    const providerId = req.params.id;
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const existing = await SavedProvider.findOne({ userId: req.user._id, providerId });
    if (existing) {
      return res.json({ success: true, message: "Provider already saved" });
    }

    await SavedProvider.create({ userId: req.user._id, providerId });
    res.json({ success: true, message: "Provider saved successfully" });
  } catch (err) {
    console.error("❌ Error saving provider:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Remove saved provider
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await SavedProvider.findOneAndDelete({
      userId: req.user._id,
      providerId: req.params.id,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Provider not found in saved list" });
    }

    res.json({ success: true, message: "Provider removed from saved list" });
  } catch (err) {
    console.error("❌ Error removing saved provider:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
