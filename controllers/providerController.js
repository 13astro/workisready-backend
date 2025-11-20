import Provider from "../models/Providers.js";
import fs from "fs";

// ✅ Get provider by userId (used in /me)
export const getProviderByUserId = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found.",
      });
    }

    res.json({ success: true, provider });
  } catch (error) {
    console.error("❌ Error fetching provider by user ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching provider information.",
    });
  }
};

// ✅ Update provider info
export const updateProvider = async (req, res) => {
  try {
    const userId = req.user._id;
    const provider = await Provider.findOne({ userId });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found.",
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

    // ✅ Handle new uploads (replace existing files)
    if (req.files?.profilePic?.[0]) {
      if (provider.profilePic && fs.existsSync(provider.profilePic)) {
        fs.unlinkSync(provider.profilePic);
      }
      provider.profilePic = req.files.profilePic[0].path;
    }

    if (req.files?.idCard?.[0]) {
      if (provider.idCard && fs.existsSync(provider.idCard)) {
        fs.unlinkSync(provider.idCard);
      }
      provider.idCard = req.files.idCard[0].path;
    }

    if (req.files?.sampleWork?.length > 0) {
      provider.sampleWork = [
        ...provider.sampleWork,
        ...req.files.sampleWork.map((f) => f.path),
      ];
    }

    // ✅ Update text fields
    provider.fullName = fullName || provider.fullName;
    provider.category = category || provider.category;
    provider.location = location || provider.location;
    provider.contact = contact || provider.contact;
    provider.email = email || provider.email;
    provider.bio = bio || provider.bio;
    provider.organizationType = organizationType || provider.organizationType;
    provider.skills = skills ? JSON.parse(skills) : provider.skills;
    provider.paymentMethods = paymentMethods
      ? JSON.parse(paymentMethods)
      : provider.paymentMethods;

    await provider.save();

    res.json({
      success: true,
      message: "Provider profile updated successfully!",
      provider,
    });
  } catch (error) {
    console.error("❌ Error updating provider:", error);
    res.status(500).json({
      success: false,
      message: "Server error during provider update.",
    });
  }
};
