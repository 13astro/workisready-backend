// models/Provider.js
import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, required: true },
    category: { type: String, default: "" },
    location: { type: String, required: true },
    rate: { type: Number, default: 0 },
    contact: { type: String, required: true },
    email: { type: String, required: true },
    bio: { type: String, required: true },
    organizationType: {
      type: String,
      enum: ["individual", "organization"],
      default: "individual",
    },
    skills: [String],
    profilePic: { type: String, default: "" },
    idCard: { type: String, default: "" },
    sampleWork: [String],
    paymentMethods: {
  type: [String],
  default: [],
},

reviews: [
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true }, // Name of reviewer
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }
],
averageRating: { type: Number, default: 0 },


  },
  { timestamps: true }
);

providerSchema.methods.calculateRating = function () {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    return;
  }

  const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.averageRating = total / this.reviews.length;
};

export default mongoose.model("Provider", providerSchema);
