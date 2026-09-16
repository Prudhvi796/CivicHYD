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
|
| This is optional for now. The backend will support it when we implement
| the resolution workflow.
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

    /*
     * Kept for backward compatibility with the current application.
     *
     * Example:
     * "17.3850, 78.4867"
     */

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

    /*
     * Severity score is a numerical representation of how serious
     * the reported issue appears based on explainable rules.
     *
     * Example:
     * 0 - 100
     */

    severityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },


    /*
     * Human-readable explanation for the severity score.
     *
     * Example:
     * [
     *   "Road safety issue",
     *   "High-risk location",
     *   "Multiple similar reports"
     * ]
     */

    severityReasons: {
      type: [String],
      default: []
    },


    /*
     * Priority generated from the severity/decision rules.
     */

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


    /*
     * Department automatically suggested by the routing engine.
     *
     * Examples:
     * GHMC Roads
     * GHMC Sanitation
     * Water Works
     * Street Lighting
     */

    department: {
      type: String,
      default: null,
      index: true
    },


    /*
     * Explanation for department routing.
     *
     * This makes the system explainable rather than pretending that
     * a simple rule-based decision is "AI".
     */

    routingReason: {
      type: String,
      default: ""
    },


    /* ---------------------------------------------------------------
       DUPLICATE DETECTION
    --------------------------------------------------------------- */

    /*
     * If this complaint appears to be a duplicate of another complaint,
     * store the original complaint ID here.
     */

    duplicateOf: {
      type: String,
      default: null,
      index: true
    },


    /*
     * Similarity score between 0 and 1.
     *
     * Example:
     * 0.91 = highly similar
     */

    duplicateScore: {
      type: Number,
      default: null,
      min: 0,
      max: 1
    },


    /*
     * Human-readable explanation.
     */

    duplicateReason: {
      type: String,
      default: ""
    },


    /* ---------------------------------------------------------------
       GEOGRAPHIC CLUSTERING
    --------------------------------------------------------------- */

    /*
     * Complaints belonging to the same geographical civic incident
     * can share the same cluster/incident ID.
     */

    clusterId: {
      type: String,
      default: null,
      index: true
    },


    /*
     * Number of related reports detected around the same issue.
     */

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
|
| These make common admin queries faster.
|
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

const Complaint =
  mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;