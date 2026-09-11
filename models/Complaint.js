const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    mobile: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    image: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected"
      ],
      default: "Submitted"
    }
  },
  {
    timestamps: true
  }
);

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;