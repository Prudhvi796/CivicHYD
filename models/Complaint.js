const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Status History
|--------------------------------------------------------------------------
| Stores every important status change so the admin and citizen can see
| how a complaint moved through the system.
*/

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected"
      ],
      required: true
    },

    timestamp: {
      type: Date,
      default: Date.now
    },

    note: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);


/*
|--------------------------------------------------------------------------
| Resolution Proof
|--------------------------------------------------------------------------
| When a complaint is resolved, the authority/admin can attach proof.
*/

const resolutionProofSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      default: ""
    },

    note: {
      type: String,
      default: ""
    },

    resolvedAt: {
      type: Date
    }
  },
  {
    _id: false
  }
);


/*
|--------------------------------------------------------------------------
| Complaint Schema
|--------------------------------------------------------------------------
*/

const complaintSchema = new mongoose.Schema(
  {

    /* ---------------------------------------------------------------
       BASIC COMPLAINT ID
    --------------------------------------------------------------- */

    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },


    /* ---------------------------------------------------------------
       CITIZEN INFORMATION
    --------------------------------------------------------------- */

    name: {
      type: String,
      required: true,
      trim: true
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true
    },


    /* ---------------------------------------------------------------
       COMPLAINT INFORMATION
    --------------------------------------------------------------- */

    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },


    /* ---------------------------------------------------------------
       LOCATION
    --------------------------------------------------------------- */

    location: {
      type: String,
      required: true,
      trim: true
    },

    latitude: {
      type: Number,
      default: null
    },

    longitude: {
      type: Number,
      default: null
    },


    /* ---------------------------------------------------------------
       CITIZEN EVIDENCE
    --------------------------------------------------------------- */

    image: {
      type: String,
      default: ""
    },


    /* ---------------------------------------------------------------
       STATUS
    --------------------------------------------------------------- */

    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected"
      ],
      default: "Submitted",
      index: true
    },


    /* ---------------------------------------------------------------
       CIVIC INTELLIGENCE
    --------------------------------------------------------------- */

    severityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },

    severityReasons: {
      type: [String],
      default: []
    },

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High"
      ],
      default: null,
      index: true
    },

    department: {
      type: String,
      default: null,
      index: true
    },

    routingReason: {
      type: String,
      default: ""
    },


    /* ---------------------------------------------------------------
       DUPLICATE DETECTION
    --------------------------------------------------------------- */

    duplicateOf: {
      type: String,
      default: null
    },

    duplicateScore: {
      type: Number,
      default: null,
      min: 0,
      max: 1
    },

    duplicateReason: {
      type: String,
      default: ""
    },


    /* ---------------------------------------------------------------
       GEOGRAPHIC CLUSTERING
    --------------------------------------------------------------- */

    clusterId: {
      type: String,
      default: null
    },

    clusterSize: {
      type: Number,
      default: 1,
      min: 1
    },


    /* ---------------------------------------------------------------
       STATUS HISTORY
    --------------------------------------------------------------- */

    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },


    /* ---------------------------------------------------------------
       RESOLUTION PROOF
    --------------------------------------------------------------- */

    resolutionProof: {
      type: resolutionProofSchema,
      default: null
    }

  },

  {
    timestamps: true
  }
);


/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
| These indexes make common admin queries faster.
|--------------------------------------------------------------------------
*/

complaintSchema.index({
  status: 1,
  priority: 1
});

complaintSchema.index({
  category: 1,
  status: 1
});

complaintSchema.index({
  department: 1,
  status: 1
});

complaintSchema.index({
  clusterId: 1
});

complaintSchema.index({
  duplicateOf: 1
});


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

const Complaint = mongoose.model(
  "Complaint",
  complaintSchema
);

module.exports = Complaint;