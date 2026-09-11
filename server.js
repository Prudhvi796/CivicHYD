const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const Complaint = require("./models/Complaint");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");
  })
  .catch((error) => {
    console.error("MongoDB Connection Error:", error.message);
  });


// Test route
app.get("/", (req, res) => {
  res.send("CivicHYD Backend is Running!");
});


// Create a new complaint
app.post("/api/complaints", async (req, res) => {
  try {
    const {
      name,
      mobile,
      category,
      description,
      location,
      image
    } = req.body;

    // Generate unique complaint ID
    const complaintId =
      "CHYD-" +
      Date.now().toString().slice(-6) +
      Math.floor(Math.random() * 1000);

    const complaint = new Complaint({
      complaintId,
      name,
      mobile,
      category,
      description,
      location,
      image: image || ""
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      complaint
    });

  } catch (error) {
    console.error("Complaint Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit complaint"
    });
  }
});


// Get all complaints
app.get("/api/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({
      createdAt: -1
    });

    res.status(200).json({
      success: true,
      complaints
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints"
    });
  }
});


// Get complaint by Complaint ID
app.get("/api/complaints/:complaintId", async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.complaintId
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    res.status(200).json({
      success: true,
      complaint
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaint"
    });
  }
});


// Update complaint status
app.put("/api/complaints/:complaintId", async (req, res) => {
  try {
    const { status } = req.body;

    const complaint = await Complaint.findOneAndUpdate(
      {
        complaintId: req.params.complaintId
      },
      {
        status
      },
      {
        new: true
      }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Complaint status updated",
      complaint
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update complaint"
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`CivicHYD server running on http://localhost:${PORT}`);
});