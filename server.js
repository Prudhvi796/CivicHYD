const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const Complaint = require("./models/Complaint");

const app = express();

const PORT = process.env.PORT || 5000;


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));


/* =========================================
   MONGODB CONNECTION
========================================= */

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {

        console.log("MongoDB Connected Successfully!");

    })
    .catch((error) => {

        console.error(
            "MongoDB Connection Error:",
            error.message
        );

    });


/* =========================================
   API ROUTES
========================================= */


/* CREATE COMPLAINT */

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


            /* VALIDATION */

            if (

                !name ||

                !mobile ||

                !category ||

                !description ||

                !location

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill all required fields."

                });

            }


            /* MOBILE VALIDATION */

            if (

                !/^[0-9]{10}$/.test(
                    mobile
                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid mobile number."

                });

            }


            /* GENERATE COMPLAINT ID */

            const complaintId =

                "CHYD-" +

                Date.now()
                    .toString()
                    .slice(-6) +

                Math.floor(
                    100 + Math.random() * 900
                );


            /* CREATE COMPLAINT */

            const complaint =
                new Complaint({

                    complaintId:

                        complaintId,

                    name:

                        name.trim(),

                    mobile:

                        mobile.trim(),

                    category:

                        category,

                    description:

                        description.trim(),

                    location:

                        location.trim(),

                    image:

                        image || "",

                    status:

                        "Submitted"

                });


            /* SAVE */

            await complaint.save();


            return res.status(201).json({

                success: true,

                message:
                    "Complaint submitted successfully.",

                complaint:

                    complaint

            });


        }

        catch (error) {

            console.error(
                "Complaint Submission Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to submit complaint."

            });

        }

    }

);


/* =========================================
   GET ALL COMPLAINTS
========================================= */

app.get(
    "/api/complaints",

    async (req, res) => {

        try {

            const complaints =

                await Complaint
                    .find()
                    .sort({

                        createdAt: -1

                    });


            return res.status(200).json({

                success: true,

                complaints:

                    complaints

            });


        }

        catch (error) {

            console.error(
                "Fetch Complaints Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch complaints."

            });

        }

    }

);


/* =========================================
   GET COMPLAINT BY ID
========================================= */

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

                    success: false,

                    message:
                        "Complaint not found."

                });

            }


            return res.status(200).json({

                success: true,

                complaint:

                    complaint

            });


        }

        catch (error) {

            console.error(
                "Complaint Fetch Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch complaint."

            });

        }

    }

);


/* =========================================
   GET COMPLAINTS BY MOBILE NUMBER
========================================= */

app.get(
    "/api/complaints/mobile/:mobile",

    async (req, res) => {

        try {

            const mobile =
                req.params.mobile;


            const complaints =

                await Complaint
                    .find({

                        mobile:

                            mobile

                    })
                    .sort({

                        createdAt: -1

                    });


            return res.status(200).json({

                success: true,

                complaints:

                    complaints

            });


        }

        catch (error) {

            console.error(
                "Mobile Search Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch complaints."

            });

        }

    }

);


/* =========================================
   UPDATE COMPLAINT STATUS
========================================= */

app.put(
    "/api/complaints/:complaintId",

    async (req, res) => {

        try {

            const {

                status

            } = req.body;


            const validStatuses = [

                "Submitted",

                "Under Review",

                "In Progress",

                "Resolved",

                "Rejected"

            ];


            /* VALIDATE STATUS */

            if (

                !validStatuses.includes(
                    status
                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid complaint status."

                });

            }


            const complaint =

                await Complaint.findOneAndUpdate(

                    {

                        complaintId:

                            req.params.complaintId

                    },

                    {

                        status:

                            status

                    },

                    {

                        new: true

                    }

                );


            if (!complaint) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Complaint not found."

                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Complaint status updated successfully.",

                complaint:

                    complaint

            });


        }

        catch (error) {

            console.error(
                "Status Update Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update complaint status."

            });

        }

    }

);


/* =========================================
   SERVE FRONTEND
========================================= */


/*
IMPORTANT:

This serves all your HTML, CSS,
JavaScript and frontend files.
*/


app.use(
    express.static(
        path.join(
            __dirname
        )
    )
);


/* =========================================
   HOME PAGE
========================================= */

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


/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,

    () => {

        console.log(
            "================================="
        );

        console.log(
            "CivicHYD Server Started!"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "================================="
        );

    }

);