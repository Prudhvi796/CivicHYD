/* =========================================
   CIVICHYD COMPLETE JAVASCRIPT
   CONNECTED TO NODE.JS + MONGODB
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "/api/complaints";


    /* =========================================
       API FUNCTIONS
    ========================================= */

    async function getComplaints() {

        try {

            const response = await fetch(API_URL);

            const data = await response.json();

            if (data.success) {

                return data.complaints || [];

            }

            return [];

        } catch (error) {

            console.error(
                "Error fetching complaints:",
                error
            );

            return [];

        }

    }


    async function updateComplaintStatus(
        complaintId,
        status
    ) {

        try {

            const response = await fetch(

                API_URL +
                "/" +
                encodeURIComponent(complaintId),

                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        status: status

                    })

                }

            );


            const data =
                await response.json();


            return data;

        } catch (error) {

            console.error(
                "Error updating complaint:",
                error
            );

            return {

                success: false

            };

        }

    }


    /* =========================================
       HOMEPAGE STATISTICS
    ========================================= */

    async function updateHomeStats() {

        const complaints =
            await getComplaints();


        const total =
            complaints.length;


        const resolved =
            complaints.filter(
                function (complaint) {

                    return (
                        complaint.status ===
                        "Resolved"
                    );

                }
            ).length;


        const progress =
            complaints.filter(
                function (complaint) {

                    return (
                        complaint.status ===
                        "In Progress"
                    );

                }
            ).length;


        const totalReports =
            document.getElementById(
                "totalReports"
            );


        const resolvedReports =
            document.getElementById(
                "resolvedReports"
            );


        const progressReports =
            document.getElementById(
                "progressReports"
            );


        if (totalReports) {

            totalReports.textContent =
                total;

        }


        if (resolvedReports) {

            resolvedReports.textContent =
                resolved;

        }


        if (progressReports) {

            progressReports.textContent =
                progress;

        }

    }


    updateHomeStats();



    /* =========================================
       REPORT ISSUE PAGE
    ========================================= */

    const reportForm =
        document.getElementById(
            "reportForm"
        );


    if (reportForm) {


        const citizenName =
            document.getElementById(
                "citizenName"
            );


        const mobileNumber =
            document.getElementById(
                "mobileNumber"
            );


        const issueCategory =
            document.getElementById(
                "issueCategory"
            );


        const issueDescription =
            document.getElementById(
                "issueDescription"
            );


        const issueLocation =
            document.getElementById(
                "issueLocation"
            );


        const locationButton =
            document.getElementById(
                "locationButton"
            );


        const locationStatus =
            document.getElementById(
                "locationStatus"
            );


        const issuePhoto =
            document.getElementById(
                "issuePhoto"
            );


        const imagePreview =
            document.getElementById(
                "imagePreview"
            );


        const reportSuccess =
            document.getElementById(
                "reportSuccess"
            );


        const generatedComplaintId =
            document.getElementById(
                "generatedComplaintId"
            );



        /* =========================================
           CATEGORY FROM HOMEPAGE
        ========================================= */

        const urlParams =
            new URLSearchParams(
                window.location.search
            );


        const selectedCategory =
            urlParams.get(
                "category"
            );


        if (
            selectedCategory &&
            issueCategory
        ) {

            issueCategory.value =
                selectedCategory;

        }



        /* =========================================
           CURRENT LOCATION
        ========================================= */

        if (locationButton) {

            locationButton.addEventListener(

                "click",

                function () {

                    if (
                        !navigator.geolocation
                    ) {

                        locationStatus.textContent =
                            "Location is not supported by this browser.";

                        return;

                    }


                    locationStatus.textContent =
                        "Getting your location...";


                    navigator.geolocation.getCurrentPosition(

                        function (position) {

                            const latitude =
                                position.coords.latitude;


                            const longitude =
                                position.coords.longitude;


                            issueLocation.value =
                                latitude.toFixed(6) +
                                ", " +
                                longitude.toFixed(6);


                            locationStatus.textContent =
                                "✓ Current location detected.";

                        },


                        function () {

                            locationStatus.textContent =
                                "Unable to detect location. Please enter manually.";

                        }

                    );

                }

            );

        }



        /* =========================================
           IMAGE PREVIEW
        ========================================= */

        if (
            issuePhoto &&
            imagePreview
        ) {

            issuePhoto.addEventListener(

                "change",

                function () {

                    const file =
                        issuePhoto.files[0];


                    if (!file) {

                        imagePreview.innerHTML =
                            "";

                        imagePreview.style.display =
                            "none";

                        return;

                    }


                    const reader =
                        new FileReader();


                    reader.onload =
                        function (event) {

                            imagePreview.innerHTML =

                                '<img src="' +
                                event.target.result +
                                '" alt="Issue Preview" ' +
                                'style="max-width:100%; border-radius:10px; margin-top:15px;">';


                            imagePreview.style.display =
                                "block";

                        };


                    reader.readAsDataURL(
                        file
                    );

                }

            );

        }



        /* =========================================
           SUBMIT COMPLAINT
        ========================================= */

        reportForm.addEventListener(

            "submit",

            async function (event) {

                event.preventDefault();


                const name =
                    citizenName.value.trim();


                const mobile =
                    mobileNumber.value.trim();


                const category =
                    issueCategory.value;


                const description =
                    issueDescription.value.trim();


                const location =
                    issueLocation.value.trim();



                /* VALIDATION */

                if (

                    name === "" ||

                    mobile === "" ||

                    category === "" ||

                    description === "" ||

                    location === ""

                ) {

                    alert(
                        "Please fill all required fields."
                    );

                    return;

                }


                if (

                    !/^[0-9]{10}$/.test(
                        mobile
                    )

                ) {

                    alert(
                        "Enter a valid 10-digit mobile number."
                    );

                    return;

                }



                /* =========================================
                   SUBMIT FUNCTION
                ========================================= */

                async function submitComplaint(
                    imageData
                ) {

                    try {

                        const response =
                            await fetch(

                                API_URL,

                                {

                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json"

                                    },

                                    body:
                                        JSON.stringify({

                                            name:
                                                name,

                                            mobile:
                                                mobile,

                                            category:
                                                category,

                                            description:
                                                description,

                                            location:
                                                location,

                                            image:
                                                imageData || ""

                                        })

                                }

                            );


                        const data =
                            await response.json();


                        if (

                            !response.ok ||

                            !data.success

                        ) {

                            alert(

                                data.message ||

                                "Failed to submit complaint."

                            );

                            return;

                        }


                        const complaintId =
                            data.complaint.complaintId;



                        /* HIDE FORM */

                        const formCard =
                            document.querySelector(
                                ".report-form-card"
                            );


                        if (formCard) {

                            formCard.style.display =
                                "none";

                        }



                        /* SHOW SUCCESS */

                        if (
                            generatedComplaintId
                        ) {

                            generatedComplaintId.textContent =
                                complaintId;

                        }


                        if (
                            reportSuccess
                        ) {

                            reportSuccess.style.display =
                                "block";


                            reportSuccess.scrollIntoView({

                                behavior:
                                    "smooth",

                                block:
                                    "center"

                            });

                        }


                        updateHomeStats();


                        console.log(
                            "Complaint saved:",
                            data.complaint
                        );

                    }

                    catch (error) {

                        console.error(
                            "Submission Error:",
                            error
                        );


                        alert(
                            "Unable to connect to server. Make sure the server is running."
                        );

                    }

                }



                /* =========================================
                   READ IMAGE
                ========================================= */

                if (

                    issuePhoto &&

                    issuePhoto.files.length > 0

                ) {

                    const reader =
                        new FileReader();


                    reader.onload =
                        function (event) {

                            submitComplaint(
                                event.target.result
                            );

                        };


                    reader.readAsDataURL(
                        issuePhoto.files[0]
                    );

                }


                else {

                    submitComplaint(
                        ""
                    );

                }

            }

        );

    }



    /* =========================================
       TRACK COMPLAINT BY ID
    ========================================= */

    const trackButton =
        document.getElementById(
            "trackButton"
        );


    const trackInput =
        document.getElementById(
            "trackComplaintId"
        );


    const trackingResult =
        document.getElementById(
            "trackingResult"
        );


    const statusSteps = [

        "Submitted",

        "Under Review",

        "In Progress",

        "Resolved"

    ];



    function createTimeline(status) {


        let currentIndex =
            statusSteps.indexOf(
                status
            );


        if (
            currentIndex === -1
        ) {

            currentIndex = 0;

        }


        let html =

            '<div class="track-progress">' +

            '<p class="track-progress-title">' +

            'COMPLAINT PROGRESS' +

            '</p>' +

            '<div class="track-timeline">';



        statusSteps.forEach(

            function (
                step,
                index
            ) {


                let active =
                    "";


                if (
                    index <= currentIndex
                ) {

                    active =
                        "active";

                }


                let icon =
                    index + 1;


                if (
                    index < currentIndex
                ) {

                    icon =
                        "✓";

                }


                html +=

                    '<div class="track-step ' +

                    active +

                    '">' +

                    '<div class="track-circle">' +

                    icon +

                    '</div>' +

                    '<p>' +

                    step +

                    '</p>' +

                    '</div>';

            }

        );


        html +=

            '</div></div>';


        return html;

    }



    if (

        trackButton &&

        trackInput &&

        trackingResult

    ) {


        trackButton.addEventListener(

            "click",

            async function () {


                const complaintId =

                    trackInput.value
                    .trim()
                    .toUpperCase();


                if (!complaintId) {

                    trackingResult.innerHTML =

                        "<p>Please enter a Complaint ID.</p>";

                    return;

                }


                try {

                    const response =

                        await fetch(

                            API_URL +

                            "/" +

                            encodeURIComponent(
                                complaintId
                            )

                        );


                    const data =

                        await response.json();


                    if (
                        !data.success
                    ) {

                        trackingResult.innerHTML =

                            "<p>Complaint not found. Check the Complaint ID.</p>";

                        return;

                    }


                    const complaint =
                        data.complaint;


                    trackingResult.innerHTML =

                        '<div class="tracking-card">' +

                        '<p class="section-label">' +

                        'COMPLAINT FOUND' +

                        '</p>' +

                        '<h3>' +

                        complaint.category +

                        '</h3>' +

                        '<p><strong>Complaint ID:</strong> ' +

                        complaint.complaintId +

                        '</p>' +

                        '<p>📍 ' +

                        complaint.location +

                        '</p>' +

                        '<p><strong>Status:</strong> ' +

                        complaint.status +

                        '</p>' +

                        '<p>📅 ' +

                        new Date(
                            complaint.createdAt
                        )
                        .toLocaleDateString() +

                        '</p>' +

                        createTimeline(
                            complaint.status
                        ) +

                        '</div>';

                }

                catch (error) {

                    console.error(
                        error
                    );


                    trackingResult.innerHTML =

                        "<p>Unable to connect to server.</p>";

                }

            }

        );

    }



    /* =========================================
       MY REPORTS
       SEARCH BY MOBILE NUMBER
    ========================================= */

    const searchMobile =
        document.getElementById(
            "searchMobile"
        );


    const searchReportsButton =
        document.getElementById(
            "searchReportsButton"
        );


    const reportsList =
        document.getElementById(
            "reportsList"
        );


    const noReports =
        document.getElementById(
            "noReports"
        );


    const reportsMessage =
        document.getElementById(
            "reportsMessage"
        );



    if (

        searchMobile &&

        searchReportsButton &&

        reportsList

    ) {


        searchReportsButton.addEventListener(

            "click",

            async function () {


                const mobile =

                    searchMobile.value.trim();


                reportsList.innerHTML =
                    "";


                if (reportsMessage) {

                    reportsMessage.textContent =
                        "";

                }


                if (noReports) {

                    noReports.style.display =
                        "none";

                }



                /* VALIDATE MOBILE */

                if (

                    !/^[0-9]{10}$/.test(
                        mobile
                    )

                ) {

                    if (reportsMessage) {

                        reportsMessage.textContent =

                            "Please enter a valid 10-digit mobile number.";

                    }

                    return;

                }


                if (reportsMessage) {

                    reportsMessage.textContent =
                        "Loading your reports...";

                }


                const complaints =
                    await getComplaints();


                const userReports =

                    complaints.filter(

                        function (
                            complaint
                        ) {

                            return (

                                complaint.mobile ===
                                mobile

                            );

                        }

                    );


                if (

                    userReports.length === 0

                ) {

                    if (reportsMessage) {

                        reportsMessage.textContent =
                            "";

                    }


                    if (noReports) {

                        noReports.style.display =
                            "block";

                    }

                    return;

                }


                if (reportsMessage) {

                    reportsMessage.textContent =
                        "";

                }


                userReports

                    .slice()

                    .reverse()

                    .forEach(

                        function (
                            report
                        ) {


                            const card =

                                document.createElement(
                                    "div"
                                );


                            card.className =
                                "report-card";


                            const reportDate =

                                report.createdAt ?

                                new Date(
                                    report.createdAt
                                )
                                .toLocaleDateString()

                                :

                                "";


                            card.innerHTML =

                                '<div class="report-card-top">' +

                                '<div>' +

                                '<span class="report-id">' +

                                report.complaintId +

                                '</span>' +

                                '<h3>' +

                                report.category +

                                '</h3>' +

                                '</div>' +

                                '<span class="status-badge">' +

                                report.status +

                                '</span>' +

                                '</div>' +

                                '<p class="report-description">' +

                                report.description +

                                '</p>' +

                                '<div class="report-details">' +

                                '<span>📍 ' +

                                report.location +

                                '</span>' +

                                '<span>📅 ' +

                                reportDate +

                                '</span>' +

                                '</div>' +

                                createTimeline(
                                    report.status
                                );


                            reportsList.appendChild(
                                card
                            );

                        }

                    );

            }

        );


        /* ENTER KEY SUPPORT */

        searchMobile.addEventListener(

            "keypress",

            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchReportsButton.click();

                }

            }

        );

    }



    /* =========================================
       ADMIN DASHBOARD
    ========================================= */

    const adminContainer =
        document.getElementById(
            "adminComplaintsContainer"
        );


    const adminEmptyState =
        document.getElementById(
            "adminEmptyState"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const searchComplaint =
        document.getElementById(
            "searchComplaint"
        );


    const refreshDashboard =
        document.getElementById(
            "refreshDashboard"
        );



    async function loadAdminDashboard() {


        if (!adminContainer) {

            return;

        }


        adminContainer.innerHTML =

            '<p style="padding:20px;">Loading complaints...</p>';


        const complaints =
            await getComplaints();



        /* =========================================
           ADMIN STATISTICS
        ========================================= */

        const totalElement =
            document.getElementById(
                "adminTotalReports"
            );


        const submittedElement =
            document.getElementById(
                "adminSubmitted"
            );


        const reviewElement =
            document.getElementById(
                "adminReview"
            );


        const progressElement =
            document.getElementById(
                "adminProgress"
            );


        const resolvedElement =
            document.getElementById(
                "adminResolved"
            );


        if (totalElement) {

            totalElement.textContent =
                complaints.length;

        }


        if (submittedElement) {

            submittedElement.textContent =

                complaints.filter(

                    c =>

                        c.status ===
                        "Submitted"

                ).length;

        }


        if (reviewElement) {

            reviewElement.textContent =

                complaints.filter(

                    c =>

                        c.status ===
                        "Under Review"

                ).length;

        }


        if (progressElement) {

            progressElement.textContent =

                complaints.filter(

                    c =>

                        c.status ===
                        "In Progress"

                ).length;

        }


        if (resolvedElement) {

            resolvedElement.textContent =

                complaints.filter(

                    c =>

                        c.status ===
                        "Resolved"

                ).length;

        }



        /* =========================================
           FILTERS
        ========================================= */

        const selectedStatus =

            statusFilter ?

            statusFilter.value

            :

            "All";


        const searchValue =

            searchComplaint ?

            searchComplaint.value
            .trim()
            .toUpperCase()

            :

            "";


        const filtered =

            complaints.filter(

                function (
                    complaint
                ) {


                    const statusMatch =

                        selectedStatus ===
                        "All" ||

                        complaint.status ===
                        selectedStatus;


                    const searchMatch =

                        complaint.complaintId

                        .toUpperCase()

                        .includes(
                            searchValue
                        );


                    return (

                        statusMatch &&

                        searchMatch

                    );

                }

            );



        adminContainer.innerHTML =
            "";



        /* =========================================
           EMPTY STATE
        ========================================= */

        if (

            filtered.length === 0

        ) {

            if (adminEmptyState) {

                adminEmptyState.style.display =
                    "block";

            }

            return;

        }


        if (adminEmptyState) {

            adminEmptyState.style.display =
                "none";

        }



        /* =========================================
           CREATE ADMIN COMPLAINT CARDS
        ========================================= */

        filtered

            .slice()

            .reverse()

            .forEach(

                function (
                    complaint
                ) {


                    const card =

                        document.createElement(
                            "div"
                        );


                    card.className =
                        "admin-complaint";


                    const complaintDate =

                        complaint.createdAt ?

                        new Date(
                            complaint.createdAt
                        )
                        .toLocaleDateString()

                        :

                        "";


                    /* =========================================
                       COMPLAINT IMAGE
                    ========================================= */

                    let imageHTML =
                        "";


                    if (

                        complaint.image &&

                        complaint.image !== ""

                    ) {

                        imageHTML =

                            '<div class="admin-photo-container">' +

                            '<p class="info-label">' +

                            'ISSUE PHOTO' +

                            '</p>' +

                            '<img ' +

                            'src="' +

                            complaint.image +

                            '" ' +

                            'alt="Complaint Photo" ' +

                            'class="admin-complaint-photo">' +

                            '</div>';

                    }

                    else {

                        imageHTML =

                            '<div class="admin-no-photo">' +

                            '📷 No photo uploaded' +

                            '</div>';

                    }



                    /* =========================================
                       COMPLAINT CARD HTML
                    ========================================= */

                    card.innerHTML =

                        '<div class="complaint-top">' +

                        '<div>' +

                        '<p class="complaint-id">' +

                        complaint.complaintId +

                        '</p>' +

                        '<h3 class="complaint-category">' +

                        complaint.category +

                        '</h3>' +

                        '</div>' +

                        '<span class="complaint-date">' +

                        complaintDate +

                        '</span>' +

                        '</div>' +



                        '<div class="complaint-info">' +


                        '<div>' +

                        '<p class="info-label">' +

                        'CITIZEN NAME' +

                        '</p>' +

                        '<p class="info-value">' +

                        complaint.name +

                        '</p>' +

                        '</div>' +


                        '<div>' +

                        '<p class="info-label">' +

                        'MOBILE NUMBER' +

                        '</p>' +

                        '<p class="info-value">' +

                        complaint.mobile +

                        '</p>' +

                        '</div>' +


                        '<div>' +

                        '<p class="info-label">' +

                        'LOCATION' +

                        '</p>' +

                        '<p class="info-value">' +

                        '📍 ' +

                        complaint.location +

                        '</p>' +

                        '</div>' +


                        '<div>' +

                        '<p class="info-label">' +

                        'DESCRIPTION' +

                        '</p>' +

                        '<p class="info-value">' +

                        complaint.description +

                        '</p>' +

                        '</div>' +


                        '</div>' +


                        imageHTML +



                        '<div class="admin-actions">' +

                        '<div class="status-group">' +

                        '<label>Status:</label>' +

                        '<select class="status-select" data-id="' +

                        complaint.complaintId +

                        '">' +



                        '<option value="Submitted"' +

                        (

                            complaint.status ===
                            "Submitted"

                            ?

                            " selected"

                            :

                            ""

                        ) +

                        '>Submitted</option>' +



                        '<option value="Under Review"' +

                        (

                            complaint.status ===
                            "Under Review"

                            ?

                            " selected"

                            :

                            ""

                        ) +

                        '>Under Review</option>' +



                        '<option value="In Progress"' +

                        (

                            complaint.status ===
                            "In Progress"

                            ?

                            " selected"

                            :

                            ""

                        ) +

                        '>In Progress</option>' +



                        '<option value="Resolved"' +

                        (

                            complaint.status ===
                            "Resolved"

                            ?

                            " selected"

                            :

                            ""

                        ) +

                        '>Resolved</option>' +



                        '<option value="Rejected"' +

                        (

                            complaint.status ===
                            "Rejected"

                            ?

                            " selected"

                            :

                            ""

                        ) +

                        '>Rejected</option>' +



                        '</select>' +

                        '</div>' +



                        '<button class="update-status-btn" data-id="' +

                        complaint.complaintId +

                        '">' +

                        'Update Status' +

                        '</button>' +

                        '</div>';



                    adminContainer.appendChild(
                        card
                    );

                }

            );



        /* =========================================
           UPDATE STATUS BUTTONS
        ========================================= */

        const updateButtons =

            document.querySelectorAll(
                ".update-status-btn"
            );


        updateButtons.forEach(

            function (
                button
            ) {


                button.addEventListener(

                    "click",

                    async function () {


                        const complaintId =
                            this.dataset.id;


                        const select =

                            document.querySelector(

                                '.status-select[data-id="' +

                                complaintId +

                                '"]'

                            );


                        if (!select) {

                            return;

                        }


                        const newStatus =
                            select.value;


                        this.textContent =
                            "Updating...";


                        this.disabled =
                            true;


                        const result =

                            await updateComplaintStatus(

                                complaintId,

                                newStatus

                            );


                        if (

                            result.success

                        ) {

                            loadAdminDashboard();

                            updateHomeStats();

                        }


                        else {

                            alert(

                                "Failed to update complaint status."

                            );


                            this.textContent =
                                "Update Status";


                            this.disabled =
                                false;

                        }

                    }

                );

            }

        );

    }



    /* =========================================
       ADMIN FILTER EVENTS
    ========================================= */

    if (statusFilter) {

        statusFilter.addEventListener(

            "change",

            loadAdminDashboard

        );

    }


    if (searchComplaint) {

        searchComplaint.addEventListener(

            "input",

            loadAdminDashboard

        );

    }


    if (refreshDashboard) {

        refreshDashboard.addEventListener(

            "click",

            loadAdminDashboard

        );

    }


    loadAdminDashboard();



    /* =========================================
       MAP
    ========================================= */

    const mapElement =
        document.getElementById(
            "civicMap"
        );


    if (

        mapElement &&

        typeof L !==
        "undefined"

    ) {


        const map =

            L.map(
                "civicMap"
            )

            .setView(

                [

                    17.3850,

                    78.4867

                ],

                12

            );



        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                maxZoom:
                    19,

                attribution:

                    "&copy; OpenStreetMap contributors"

            }

        )

        .addTo(
            map
        );



        async function loadMapComplaints() {


            const complaints =
                await getComplaints();


            complaints.forEach(

                function (
                    complaint
                ) {


                    if (

                        !complaint.location

                    ) {

                        return;

                    }


                    const parts =

                        complaint.location
                        .split(",");


                    if (

                        parts.length !==
                        2

                    ) {

                        return;

                    }


                    const latitude =

                        parseFloat(
                            parts[0]
                        );


                    const longitude =

                        parseFloat(
                            parts[1]
                        );


                    if (

                        isNaN(latitude) ||

                        isNaN(longitude)

                    ) {

                        return;

                    }


                    L.marker(

                        [

                            latitude,

                            longitude

                        ]

                    )

                    .addTo(
                        map
                    )

                    .bindPopup(

                        '<strong>' +

                        complaint.category +

                        '</strong>' +

                        '<br><br>' +

                        complaint.description +

                        '<br><br>' +

                        '<b>Status:</b> ' +

                        complaint.status +

                        '<br><br>' +

                        '<b>ID:</b> ' +

                        complaint.complaintId

                    );

                }

            );

        }


        loadMapComplaints();

    }


});