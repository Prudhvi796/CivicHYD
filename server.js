const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const Complaint = require("./models/Complaint");

const app = express();

const PORT = process.env.PORT || 5000;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(express.static(__dirname));


/* =========================================================
   MONGODB
========================================================= */

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
    });


/* =========================================================
   CONSTANTS
========================================================= */

const VALID_STATUSES = [
    "Submitted",
    "Under Review",
    "In Progress",
    "Resolved",
    "Rejected"
];


/* =========================================================
   CATEGORY → DEPARTMENT ROUTING
========================================================= */

function determineDepartment(category) {

    const value = String(category || "").toLowerCase();

    if (
        value.includes("road") ||
        value.includes("pothole") ||
        value.includes("footpath")
    ) {
        return {
            department: "GHMC Roads",
            reason: "Road-related category"
        };
    }

    if (
        value.includes("garbage") ||
        value.includes("waste") ||
        value.includes("sanitation")
    ) {
        return {
            department: "GHMC Sanitation",
            reason: "Waste or sanitation category"
        };
    }

    if (
        value.includes("streetlight") ||
        value.includes("street light") ||
        value.includes("lighting")
    ) {
        return {
            department: "Street Lighting",
            reason: "Street-lighting category"
        };
    }

    if (
        value.includes("water") ||
        value.includes("pipeline") ||
        value.includes("supply")
    ) {
        return {
            department: "Water Supply",
            reason: "Water-related category"
        };
    }

    if (
        value.includes("drainage") ||
        value.includes("sewage") ||
        value.includes("sewer")
    ) {
        return {
            department: "Drainage & Sewage",
            reason: "Drainage or sewage category"
        };
    }

    return {
        department: "Civic General",
        reason: "No specialized department matched"
    };
}


/* =========================================================
   SEVERITY ENGINE
========================================================= */

/*
 * This is deliberately RULE-BASED.
 *
 * We are NOT calling this AI.
 *
 * The score is explainable and based on:
 * - category
 * - description keywords
 * - evidence
 * - geographic information
 *
 * Score: 0 - 100
 */

function calculateSeverity(category, description, hasImage) {

    const categoryText =
        String(category || "").toLowerCase();

    const descriptionText =
        String(description || "").toLowerCase();

    let score = 30;

    const reasons = [];


    /* ---------- CATEGORY ---------- */

    if (
        categoryText.includes("pothole") ||
        categoryText.includes("road")
    ) {
        score += 20;

        reasons.push(
            "Road safety issue"
        );
    }

    if (
        categoryText.includes("drainage") ||
        categoryText.includes("sewage")
    ) {
        score += 20;

        reasons.push(
            "Drainage or sewage issue"
        );
    }

    if (
        categoryText.includes("water")
    ) {
        score += 15;

        reasons.push(
            "Essential water-service issue"
        );
    }

    if (
        categoryText.includes("streetlight") ||
        categoryText.includes("street light")
    ) {
        score += 12;

        reasons.push(
            "Night-time visibility concern"
        );
    }

    if (
        categoryText.includes("garbage") ||
        categoryText.includes("waste")
    ) {
        score += 10;

        reasons.push(
            "Public sanitation concern"
        );
    }


    /* ---------- DESCRIPTION ---------- */

    const highRiskWords = [
        "accident",
        "danger",
        "dangerous",
        "injury",
        "injured",
        "blocked",
        "flood",
        "flooding",
        "open manhole",
        "electric",
        "shock",
        "fire",
        "emergency",
        "collapse",
        "crash"
    ];


    const matchedWords = [];

    highRiskWords.forEach(word => {

        if (descriptionText.includes(word)) {
            matchedWords.push(word);
        }

    });


    if (matchedWords.length > 0) {

        score += Math.min(
            matchedWords.length * 8,
            30
        );

        reasons.push(
            `Risk indicators: ${matchedWords.slice(0, 3).join(", ")}`
        );
    }


    /* ---------- PHOTO EVIDENCE ---------- */

    if (hasImage) {

        score += 5;

        reasons.push(
            "Photo evidence provided"
        );
    }


    /* ---------- LIMIT ---------- */

    score =
        Math.max(
            0,
            Math.min(100, score)
        );


    let priority = "Low";

    if (score >= 70) {
        priority = "High";
    } else if (score >= 50) {
        priority = "Medium";
    }


    if (reasons.length === 0) {

        reasons.push(
            "Standard civic issue"
        );
    }


    return {
        score,
        priority,
        reasons
    };
}


/* =========================================================
   COORDINATE EXTRACTION
========================================================= */

function extractCoordinates(location) {

    if (!location) {
        return {
            latitude: null,
            longitude: null
        };
    }


    const parts =
        String(location)
            .split(",");


    if (parts.length < 2) {

        return {
            latitude: null,
            longitude: null
        };
    }


    const latitude =
        parseFloat(parts[0].trim());

    const longitude =
        parseFloat(parts[1].trim());


    if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude)
    ) {

        return {
            latitude: null,
            longitude: null
        };
    }


    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {

        return {
            latitude: null,
            longitude: null
        };
    }


    return {
        latitude,
        longitude
    };
}


/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(text) {

    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================================
   SIMPLE TEXT SIMILARITY
========================================================= */

/*
 * Explainable word-overlap similarity.
 *
 * Example:
 *
 * "large pothole near road"
 * "huge pothole near road"
 *
 * shares important words and may be considered similar.
 *
 * This is NOT machine learning.
 */

function calculateTextSimilarity(textA, textB) {

    const a =
        new Set(
            normalizeText(textA)
                .split(" ")
                .filter(word => word.length > 2)
        );


    const b =
        new Set(
            normalizeText(textB)
                .split(" ")
                .filter(word => word.length > 2)
        );


    if (!a.size || !b.size) {
        return 0;
    }


    let intersection = 0;

    a.forEach(word => {

        if (b.has(word)) {
            intersection++;
        }

    });


    const union =
        new Set([
            ...a,
            ...b
        ]).size;


    return union
        ? intersection / union
        : 0;
}


/* =========================================================
   DISTANCE BETWEEN COORDINATES
========================================================= */

function calculateDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    if (
        lat1 === null ||
        lon1 === null ||
        lat2 === null ||
        lon2 === null
    ) {
        return null;
    }


    const earthRadius = 6371;


    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;


    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;
}


/* =========================================================
   FIND POSSIBLE DUPLICATE
========================================================= */

async function findPossibleDuplicate(
    category,
    description,
    latitude,
    longitude
) {

    /*
     * Look at recent complaints first.
     *
     * We don't need to compare against thousands of old
     * complaints for this prototype.
     */

    const recentComplaints =
        await Complaint.find({
            category: category,
            status: {
                $ne: "Rejected"
            }
        })
        .sort({
            createdAt: -1
        })
        .limit(100);


    let bestMatch = null;


    for (const complaint of recentComplaints) {

        const textSimilarity =
            calculateTextSimilarity(
                description,
                complaint.description
            );


        const distance =
            calculateDistanceKm(
                latitude,
                longitude,
                complaint.latitude,
                complaint.longitude
            );


        /*
         * A complaint becomes a strong duplicate candidate
         * when both its text and location are reasonably close.
         */

        let score = textSimilarity;


        if (
            distance !== null &&
            distance <= 0.3
        ) {
            score += 0.35;
        } else if (
            distance !== null &&
            distance <= 0.75
        ) {
            score += 0.15;
        }


        score =
            Math.min(1, score);


        if (
            score >= 0.70 &&
            (
                !bestMatch ||
                score > bestMatch.score
            )
        ) {

            bestMatch = {
                complaint,
                score,
                distance
            };
        }
    }


    return bestMatch;
}


/* =========================================================
   FIND GEOGRAPHIC CLUSTER
========================================================= */

async function findNearbyCluster(
    category,
    latitude,
    longitude
) {

    if (
        latitude === null ||
        longitude === null
    ) {
        return null;
    }


    const nearby =
        await Complaint.find({
            category: category,
            latitude: {
                $ne: null
            },
            longitude: {
                $ne: null
            },
            status: {
                $ne: "Rejected"
            }
        })
        .sort({
            createdAt: -1
        })
        .limit(200);


    const nearbyReports = [];


    for (const complaint of nearby) {

        const distance =
            calculateDistanceKm(
                latitude,
                longitude,
                complaint.latitude,
                complaint.longitude
            );


        if (
            distance !== null &&
            distance <= 0.75
        ) {

            nearbyReports.push({
                complaint,
                distance
            });
        }
    }


    if (!nearbyReports.length) {
        return null;
    }


    /*
     * Reuse an existing cluster if one of the nearby reports
     * already belongs to one.
     */

    const existingCluster =
        nearbyReports.find(
            item => item.complaint.clusterId
        );


    if (existingCluster) {

        return {
            clusterId:
                existingCluster.complaint.clusterId,

            size:
                nearbyReports.length + 1
        };
    }


    return {
        clusterId:
            `CL-${Date.now().toString().slice(-8)}`,

        size:
            nearbyReports.length + 1
    };
}


/* =========================================================
   GENERATE COMPLAINT ID
========================================================= */

function generateComplaintId() {

    const timestamp =
        Date.now()
            .toString()
            .slice(-6);


    const random =
        Math.floor(
            100 + Math.random() * 900
        );


    return `CHYD-${timestamp}-${random}`;
}


/* =========================================================
   CREATE COMPLAINT
========================================================= */

app.post(
    "/api/complaints",
    async (req, res) => {

        try {

            const {
                name,
                mobile,
                category,
                description,
                location,
                image
            } = req.body;


            /* ---------- VALIDATION ---------- */

            if (
                !name ||
                !mobile ||
                !category ||
                !description ||
                !location
            ) {

                return res.status(400).json({
                    message:
                        "Please provide all required fields."
                });
            }


            if (
                !/^\d{10}$/.test(
                    String(mobile).trim()
                )
            ) {

                return res.status(400).json({
                    message:
                        "Mobile number must contain exactly 10 digits."
                });
            }


            if (
                String(description).trim().length < 5
            ) {

                return res.status(400).json({
                    message:
                        "Description is too short."
                });
            }


            /* ---------- LOCATION ---------- */

            const coordinates =
                extractCoordinates(location);


            /* ---------- ROUTING ---------- */

            const routing =
                determineDepartment(category);


            /* ---------- SEVERITY ---------- */

            const severity =
                calculateSeverity(
                    category,
                    description,
                    Boolean(image)
                );


            /* ---------- DUPLICATE ---------- */

            const duplicate =
                await findPossibleDuplicate(
                    category,
                    description,
                    coordinates.latitude,
                    coordinates.longitude
                );


            /* ---------- CLUSTER ---------- */

            const cluster =
                await findNearbyCluster(
                    category,
                    coordinates.latitude,
                    coordinates.longitude
                );


            /* ---------- ID ---------- */

            const complaintId =
                generateComplaintId();


            /* ---------- STATUS HISTORY ---------- */

            const initialHistory = [
                {
                    status: "Submitted",
                    timestamp: new Date(),
                    note: "Complaint submitted by citizen"
                }
            ];


            /* ---------- CREATE ---------- */

            const complaint =
                await Complaint.create({

                    complaintId,

                    name:
                        String(name).trim(),

                    mobile:
                        String(mobile).trim(),

                    category:
                        String(category).trim(),

                    description:
                        String(description).trim(),

                    location:
                        String(location).trim(),

                    latitude:
                        coordinates.latitude,

                    longitude:
                        coordinates.longitude,

                    image:
                        image || "",

                    status:
                        "Submitted",

                    severityScore:
                        severity.score,

                    severityReasons:
                        severity.reasons,

                    priority:
                        severity.priority,

                    department:
                        routing.department,

                    routingReason:
                        routing.reason,

                    duplicateOf:
                        duplicate
                            ? duplicate.complaint.complaintId
                            : null,

                    duplicateScore:
                        duplicate
                            ? duplicate.score
                            : null,

                    duplicateReason:
                        duplicate
                            ? `Similar report found ${
                                duplicate.complaint.complaintId
                              }${
                                duplicate.distance !== null
                                    ? ` within ${duplicate.distance.toFixed(2)} km`
                                    : ""
                              }`
                            : "",

                    clusterId:
                        cluster
                            ? cluster.clusterId
                            : null,

                    clusterSize:
                        cluster
                            ? cluster.size
                            : 1,

                    statusHistory:
                        initialHistory
                });


            /* ---------- RESPONSE ---------- */

            return res.status(201).json({

                message:
                    "Complaint submitted successfully.",

                complaintId:
                    complaint.complaintId,

                complaint: {
                    complaintId:
                        complaint.complaintId,

                    status:
                        complaint.status,

                    priority:
                        complaint.priority,

                    severityScore:
                        complaint.severityScore,

                    department:
                        complaint.department,

                    duplicateOf:
                        complaint.duplicateOf,

                    clusterId:
                        complaint.clusterId
                }

            });

        } catch (error) {

            console.error(
                "Create complaint error:",
                error
            );


            return res.status(500).json({
                message:
                    "Failed to submit complaint."
            });
        }
    }
);


/* =========================================================
   GET ALL COMPLAINTS
========================================================= */

app.get(
    "/api/complaints",
    async (req, res) => {

        try {

            const complaints =
                await Complaint.find()
                    .sort({
                        createdAt: -1
                    });


            res.json(complaints);

        } catch (error) {

            console.error(
                "Fetch complaints error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to fetch complaints."
            });
        }
    }
);


/* =========================================================
   GET COMPLAINT BY ID
========================================================= */

app.get(
    "/api/complaints/:complaintId",
    async (req, res) => {

        try {

            const complaint =
                await Complaint.findOne({
                    complaintId:
                        req.params.complaintId
                });


            if (!complaint) {

                return res.status(404).json({
                    message:
                        "Complaint not found."
                });
            }


            res.json(complaint);

        } catch (error) {

            console.error(
                "Fetch complaint error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to fetch complaint."
            });
        }
    }
);


/* =========================================================
   GET COMPLAINTS BY MOBILE
========================================================= */

app.get(
    "/api/complaints/mobile/:mobile",
    async (req, res) => {

        try {

            const mobile =
                String(
                    req.params.mobile
                ).trim();


            if (!/^\d{10}$/.test(mobile)) {

                return res.status(400).json({
                    message:
                        "Invalid mobile number."
                });
            }


            const complaints =
                await Complaint.find({
                    mobile
                })
                .sort({
                    createdAt: -1
                });


            res.json(complaints);

        } catch (error) {

            console.error(
                "Mobile complaint search error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to fetch complaints."
            });
        }
    }
);


/* =========================================================
   UPDATE COMPLAINT STATUS
========================================================= */

app.put(
    "/api/complaints/:complaintId",
    async (req, res) => {

        try {

            const {
                status,
                note,
                resolutionProof
            } = req.body;


            /* ---------- VALIDATE STATUS ---------- */

            if (
                !VALID_STATUSES.includes(status)
            ) {

                return res.status(400).json({
                    message:
                        "Invalid complaint status."
                });
            }


            /* ---------- FIND ---------- */

            const complaint =
                await Complaint.findOne({
                    complaintId:
                        req.params.complaintId
                });


            if (!complaint) {

                return res.status(404).json({
                    message:
                        "Complaint not found."
                });
            }


            /* ---------- ONLY ADD HISTORY WHEN CHANGED ---------- */

            if (complaint.status !== status) {

                complaint.status =
                    status;


                complaint.statusHistory.push({

                    status,

                    timestamp:
                        new Date(),

                    note:
                        String(note || "").trim()
                });
            }


            /* ---------- RESOLUTION PROOF ---------- */

            if (
                status === "Resolved" &&
                resolutionProof
            ) {

                complaint.resolutionProof = {

                    image:
                        resolutionProof.image || "",

                    note:
                        resolutionProof.note || "",

                    resolvedAt:
                        new Date()
                };
            }


            await complaint.save();


            res.json({

                message:
                    "Complaint updated successfully.",

                complaint

            });

        } catch (error) {

            console.error(
                "Update complaint error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to update complaint."
            });
        }
    }
);


/* =========================================================
   CIVIC ANALYTICS
========================================================= */

app.get(
    "/api/analytics",
    async (req, res) => {

        try {

            const [

                total,

                submitted,

                underReview,

                inProgress,

                resolved,

                rejected

            ] = await Promise.all([

                Complaint.countDocuments(),

                Complaint.countDocuments({
                    status: "Submitted"
                }),

                Complaint.countDocuments({
                    status: "Under Review"
                }),

                Complaint.countDocuments({
                    status: "In Progress"
                }),

                Complaint.countDocuments({
                    status: "Resolved"
                }),

                Complaint.countDocuments({
                    status: "Rejected"
                })

            ]);


            /* ---------- PRIORITY ---------- */

            const highPriority =
                await Complaint.countDocuments({
                    priority: "High"
                });


            const mediumPriority =
                await Complaint.countDocuments({
                    priority: "Medium"
                });


            const lowPriority =
                await Complaint.countDocuments({
                    priority: "Low"
                });


            /* ---------- DUPLICATES ---------- */

            const duplicateCount =
                await Complaint.countDocuments({
                    duplicateOf: {
                        $ne: null
                    }
                });


            /* ---------- DEPARTMENTS ---------- */

            const departments =
                await Complaint.distinct(
                    "department"
                );


            /* ---------- CLUSTERS ---------- */

            const clusters =
                await Complaint.distinct(
                    "clusterId",
                    {
                        clusterId: {
                            $ne: null
                        }
                    }
                );


            /* ---------- CATEGORY COUNTS ---------- */

            const categoryStats =
                await Complaint.aggregate([

                    {
                        $group: {
                            _id: "$category",
                            count: {
                                $sum: 1
                            }
                        }
                    },

                    {
                        $sort: {
                            count: -1
                        }
                    }

                ]);


            /* ---------- RESPONSE ---------- */

            res.json({

                total,

                status: {
                    submitted,
                    underReview,
                    inProgress,
                    resolved,
                    rejected
                },

                priority: {
                    high: highPriority,
                    medium: mediumPriority,
                    low: lowPriority
                },

                duplicateCount,

                departmentCount:
                    departments.length,

                clusterCount:
                    clusters.length,

                categories:
                    categoryStats

            });

        } catch (error) {

            console.error(
                "Analytics error:",
                error
            );


            res.status(500).json({
                message:
                    "Failed to generate analytics."
            });
        }
    }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            status: "OK",
            service: "CivicHYD API",
            timestamp: new Date()
        });

    }
);


/* =========================================================
   HOME
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    () => {

        console.log(
            `CivicHYD server running on port ${PORT}`
        );

    }
);