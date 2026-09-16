document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "/api/complaints";

    let allComplaints = [];


    /* =========================================================
       COMMON HELPERS
    ========================================================= */

    async function getComplaints() {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch complaints");
        }

        return await response.json();
    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function formatDate(date) {

        if (!date) return "Unknown date";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return "Unknown date";
        }

        return d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    function statusClass(status) {

        return String(status || "")
            .toLowerCase()
            .replaceAll(" ", "-");
    }


    function parseCoordinates(location) {

        if (!location) return null;

        const parts = String(location).split(",");

        if (parts.length < 2) return null;

        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {
            return null;
        }

        if (
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            return null;
        }

        return [lat, lng];
    }


    /* =========================================================
       HOME PAGE
    ========================================================= */

    async function updateHomeStats() {

        const totalElement =
            document.getElementById("totalReports");

        if (!totalElement) return;

        try {

            const complaints =
                await getComplaints();

            const total =
                complaints.length;

            const resolved =
                complaints.filter(
                    c => c.status === "Resolved"
                ).length;

            const progress =
                complaints.filter(
                    c => c.status === "In Progress"
                ).length;


            totalElement.textContent = total;


            const resolvedElement =
                document.getElementById("resolvedReports");

            if (resolvedElement) {
                resolvedElement.textContent = resolved;
            }


            const progressElement =
                document.getElementById("progressReports");

            if (progressElement) {
                progressElement.textContent = progress;
            }

        } catch (error) {

            console.error(
                "Home stats error:",
                error
            );
        }
    }


    /* =========================================================
       REPORT PAGE
    ========================================================= */

    const reportForm =
        document.getElementById("reportForm");


    if (reportForm) {

        const categorySelect =
            document.getElementById("issueCategory");

        const locationInput =
            document.getElementById("issueLocation");

        const descriptionInput =
            document.getElementById("issueDescription");

        const photoInput =
            document.getElementById("issuePhoto");

        const photoPreview =
            document.getElementById("photoPreview");

        const locationButton =
            document.getElementById("getLocationButton");


        /* ---------- CATEGORY FROM URL ---------- */

        const params =
            new URLSearchParams(
                window.location.search
            );

        const categoryFromURL =
            params.get("category");


        if (
            categoryFromURL &&
            categorySelect
        ) {

            categorySelect.value =
                categoryFromURL;
        }


        /* ---------- LOCATION ---------- */

        if (locationButton) {

            locationButton.addEventListener(
                "click",
                () => {

                    if (!navigator.geolocation) {

                        alert(
                            "Geolocation is not supported by this browser."
                        );

                        return;
                    }


                    locationButton.disabled = true;

                    locationButton.textContent =
                        "Getting location...";


                    navigator.geolocation.getCurrentPosition(

                        position => {

                            const lat =
                                position.coords.latitude;

                            const lng =
                                position.coords.longitude;


                            if (locationInput) {

                                locationInput.value =
                                    `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            }


                            locationButton.disabled =
                                false;

                            locationButton.textContent =
                                "✓ Location Captured";

                        },

                        error => {

                            console.error(
                                "Location error:",
                                error
                            );


                            alert(
                                "Unable to get your location. Please enter it manually."
                            );


                            locationButton.disabled =
                                false;

                            locationButton.textContent =
                                "Use My Location";
                        },

                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );

                }
            );
        }


        /* ---------- PHOTO PREVIEW ---------- */

        if (photoInput) {

            photoInput.addEventListener(
                "change",
                () => {

                    const file =
                        photoInput.files[0];

                    if (!file) {
                        return;
                    }


                    if (
                        !file.type.startsWith("image/")
                    ) {

                        alert(
                            "Please select an image file."
                        );

                        photoInput.value = "";

                        return;
                    }


                    const reader =
                        new FileReader();


                    reader.onload = event => {

                        if (photoPreview) {

                            photoPreview.src =
                                event.target.result;

                            photoPreview.style.display =
                                "block";
                        }
                    };


                    reader.readAsDataURL(file);
                }
            );
        }


        /* ---------- SUBMIT ---------- */

        reportForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const name =
                    document.getElementById(
                        "issueName"
                    )?.value.trim();


                const mobile =
                    document.getElementById(
                        "issueMobile"
                    )?.value.trim();


                const category =
                    categorySelect?.value.trim();


                const description =
                    descriptionInput?.value.trim();


                const location =
                    locationInput?.value.trim();


                /* ---------- VALIDATION ---------- */

                if (
                    !name ||
                    !mobile ||
                    !category ||
                    !description ||
                    !location
                ) {

                    alert(
                        "Please fill in all required fields."
                    );

                    return;
                }


                if (
                    !/^\d{10}$/.test(mobile)
                ) {

                    alert(
                        "Please enter a valid 10-digit mobile number."
                    );

                    return;
                }


                if (
                    description.length < 5
                ) {

                    alert(
                        "Please provide a little more detail about the issue."
                    );

                    return;
                }


                /* ---------- PHOTO ---------- */

                let image = "";


                const file =
                    photoInput?.files[0];


                if (file) {

                    /*
                     * Base64 is acceptable for this prototype.
                     * Production should use object storage.
                     */

                    image =
                        await readFileAsBase64(file);
                }


                /* ---------- BUTTON ---------- */

                const submitButton =
                    reportForm.querySelector(
                        'button[type="submit"]'
                    );


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Submitting...";
                }


                try {

                    const response =
                        await fetch(
                            API_URL,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    name,

                                    mobile,

                                    category,

                                    description,

                                    location,

                                    image

                                })
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.message ||
                            "Failed to submit complaint."
                        );
                    }


                    showSubmissionSuccess(
                        data
                    );


                } catch (error) {

                    console.error(
                        "Submit error:",
                        error
                    );


                    alert(
                        error.message ||
                        "Something went wrong while submitting the complaint."
                    );


                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            "Submit Complaint";
                    }
                }

            }
        );
    }


    /* =========================================================
       FILE → BASE64
    ========================================================= */

    function readFileAsBase64(file) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () => resolve(
                        reader.result
                    );


                reader.onerror =
                    reject;


                reader.readAsDataURL(file);
            }
        );
    }


    /* =========================================================
       SUBMISSION SUCCESS
    ========================================================= */

    function showSubmissionSuccess(data) {

        const formCard =
            document.querySelector(
                ".report-form-card"
            );


        const successCard =
            document.getElementById(
                "reportSuccess"
            );


        const complaintId =
            data.complaintId;


        if (
            formCard &&
            successCard
        ) {

            formCard.style.display =
                "none";

            successCard.style.display =
                "block";


            const idElement =
                successCard.querySelector(
                    "[data-complaint-id]"
                );


            if (idElement) {

                idElement.textContent =
                    complaintId;
            }


            /*
             * Show intelligence information if
             * the backend returned it.
             */

            const intelligence =
                successCard.querySelector(
                    "#submissionIntelligence"
                );


            if (
                intelligence &&
                data.complaint
            ) {

                const c =
                    data.complaint;


                intelligence.innerHTML = `

                    <div class="success-intelligence">

                        <div>
                            <span>Priority</span>
                            <strong>
                                ${escapeHTML(
                                    c.priority || "Pending"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Department</span>
                            <strong>
                                ${escapeHTML(
                                    c.department || "Pending"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Severity</span>
                            <strong>
                                ${escapeHTML(
                                    c.severityScore ?? "—"
                                )}
                            </strong>
                        </div>

                    </div>
                `;
            }

        } else {

            /*
             * Fallback for older success markup.
             */

            alert(
                `Complaint submitted successfully!\n\nComplaint ID: ${complaintId}`
            );
        }


        updateHomeStats();
    }


    /* =========================================================
       TRACK COMPLAINT
    ========================================================= */

    const trackButton =
        document.getElementById(
            "trackButton"
        );


    if (trackButton) {

        trackButton.addEventListener(
            "click",
            trackByMobile
        );
    }


    const trackInput =
        document.getElementById(
            "trackMobileNumber"
        );


    if (trackInput) {

        trackInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    trackByMobile();
                }
            }
        );
    }


    async function trackByMobile() {

        const input =
            document.getElementById(
                "trackMobileNumber"
            );


        const result =
            document.getElementById(
                "trackingResult"
            );


        if (!input || !result) {
            return;
        }


        const mobile =
            input.value.trim();


        if (
            !/^\d{10}$/.test(mobile)
        ) {

            result.innerHTML = `
                <div class="tracking-error">
                    Please enter a valid 10-digit mobile number.
                </div>
            `;

            return;
        }


        result.innerHTML = `
            <div class="tracking-loading">
                Finding your complaints...
            </div>
        `;


        try {

            const response =
                await fetch(
                    `${API_URL}/mobile/${encodeURIComponent(mobile)}`
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to find complaints."
                );
            }


            if (!data.length) {

                result.innerHTML = `
                    <div class="tracking-empty">
                        <strong>No complaints found.</strong>
                        <p>
                            No CivicHYD reports were found
                            for this mobile number.
                        </p>
                    </div>
                `;

                return;
            }


            result.innerHTML = `
                <div class="tracking-results">

                    <div class="tracking-results-heading">
                        ${data.length}
                        report${data.length === 1 ? "" : "s"}
                        found
                    </div>

                    ${data.map(
                        createTrackingCard
                    ).join("")}

                </div>
            `;


        } catch (error) {

            console.error(
                "Tracking error:",
                error
            );


            result.innerHTML = `
                <div class="tracking-error">
                    Unable to retrieve complaints.
                    Please try again.
                </div>
            `;
        }
    }


    /* =========================================================
       TRACKING CARD
    ========================================================= */

    function createTrackingCard(complaint) {

        return `
            <article class="tracking-card">

                <div class="tracking-card-header">

                    <div>

                        <div class="tracking-id">
                            ${escapeHTML(
                                complaint.complaintId
                            )}
                        </div>

                        <h3>
                            ${escapeHTML(
                                complaint.category
                            )}
                        </h3>

                    </div>

                    <span class="
                        status-badge
                        ${statusClass(complaint.status)}
                    ">
                        ${escapeHTML(
                            complaint.status
                        )}
                    </span>

                </div>


                <p class="tracking-description">
                    ${escapeHTML(
                        complaint.description
                    )}
                </p>


                <div class="tracking-meta">

                    <span>
                        📍 ${escapeHTML(
                            complaint.location
                        )}
                    </span>

                    <span>
                        🕒 ${formatDate(
                            complaint.createdAt
                        )}
                    </span>

                </div>


                ${createCitizenIntelligence(
                    complaint
                )}


                ${createTimeline(
                    complaint
                )}

            </article>
        `;
    }


    /* =========================================================
       CITIZEN INTELLIGENCE
    ========================================================= */

    function createCitizenIntelligence(
        complaint
    ) {

        const hasData =
            complaint.priority ||
            complaint.department ||
            complaint.severityScore !== null ||
            complaint.clusterId;


        if (!hasData) {
            return "";
        }


        return `
            <div class="citizen-intelligence">

                ${
                    complaint.priority
                        ? `
                            <div>
                                <span>Priority</span>
                                <strong>
                                    ${escapeHTML(
                                        complaint.priority
                                    )}
                                </strong>
                            </div>
                          `
                        : ""
                }


                ${
                    complaint.department
                        ? `
                            <div>
                                <span>Assigned Department</span>
                                <strong>
                                    ${escapeHTML(
                                        complaint.department
                                    )}
                                </strong>
                            </div>
                          `
                        : ""
                }


                ${
                    complaint.clusterId
                        ? `
                            <div>
                                <span>Civic Incident</span>
                                <strong>
                                    ${escapeHTML(
                                        complaint.clusterId
                                    )}
                                </strong>
                            </div>
                          `
                        : ""
                }

            </div>
        `;
    }


    /* =========================================================
       STATUS TIMELINE
    ========================================================= */

    function createTimeline(complaint) {

        const statuses = [
            "Submitted",
            "Under Review",
            "In Progress",
            "Resolved"
        ];


        const rejected =
            complaint.status === "Rejected";


        if (
            Array.isArray(
                complaint.statusHistory
            ) &&
            complaint.statusHistory.length
        ) {

            return `
                <div class="complaint-timeline">

                    ${complaint.statusHistory.map(
                        history => `

                            <div class="timeline-item active">

                                <span class="timeline-dot"></span>

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            history.status
                                        )}
                                    </strong>

                                    <small>
                                        ${formatDate(
                                            history.timestamp
                                        )}
                                    </small>

                                    ${
                                        history.note
                                            ? `
                                                <p>
                                                    ${escapeHTML(
                                                        history.note
                                                    )}
                                                </p>
                                              `
                                            : ""
                                    }

                                </div>

                            </div>
                        `
                    ).join("")}

                </div>
            `;
        }


        const currentIndex =
            statuses.indexOf(
                complaint.status
            );


        return `
            <div class="complaint-timeline">

                ${statuses.map(
                    (status, index) => {

                        const active =
                            index <= currentIndex;

                        return `

                            <div class="
                                timeline-item
                                ${active ? "active" : ""}
                            ">

                                <span class="timeline-dot"></span>

                                <div>

                                    <strong>
                                        ${status}
                                    </strong>

                                    ${
                                        index === currentIndex
                                            ? `
                                                <small>
                                                    Current status
                                                </small>
                                              `
                                            : ""
                                    }

                                </div>

                            </div>
                        `;
                    }
                ).join("")}


                ${
                    rejected
                        ? `
                            <div class="timeline-item active">

                                <span class="timeline-dot"></span>

                                <div>
                                    <strong>
                                        Rejected
                                    </strong>

                                    <small>
                                        Current status
                                    </small>
                                </div>

                            </div>
                          `
                        : ""
                }

            </div>
        `;
    }


    /* =========================================================
       MY REPORTS
    ========================================================= */

    const searchReportsButton =
        document.getElementById(
            "searchReportsButton"
        );


    if (searchReportsButton) {

        searchReportsButton.addEventListener(
            "click",
            loadMyReports
        );
    }


    const searchMobile =
        document.getElementById(
            "searchMobile"
        );


    if (searchMobile) {

        searchMobile.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    loadMyReports();
                }

            }
        );
    }


    async function loadMyReports() {

        const mobileInput =
            document.getElementById(
                "searchMobile"
            );


        const reportsList =
            document.getElementById(
                "reportsList"
            );


        const noReports =
            document.getElementById(
                "noReports"
            );


        const message =
            document.getElementById(
                "reportsMessage"
            );


        if (!mobileInput || !reportsList) {
            return;
        }


        const mobile =
            mobileInput.value.trim();


        if (
            !/^\d{10}$/.test(mobile)
        ) {

            if (message) {

                message.textContent =
                    "Enter a valid 10-digit mobile number.";
            }

            return;
        }


        reportsList.innerHTML = `
            <div class="loading-state">
                Loading your reports...
            </div>
        `;


        if (noReports) {
            noReports.style.display = "none";
        }


        try {

            /*
             * Important:
             *
             * We use the dedicated mobile endpoint
             * instead of downloading every complaint.
             */

            const response =
                await fetch(
                    `${API_URL}/mobile/${encodeURIComponent(mobile)}`
                );


            const reports =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    reports.message ||
                    "Failed to retrieve reports."
                );
            }


            if (!reports.length) {

                reportsList.innerHTML = "";

                if (noReports) {
                    noReports.style.display = "block";
                }

                if (message) {
                    message.textContent =
                        "No reports found for this mobile number.";
                }

                return;
            }


            if (message) {

                message.textContent =
                    `${reports.length} report${
                        reports.length === 1 ? "" : "s"
                    } found.`;
            }


            reportsList.innerHTML =
                reports.map(
                    createMyReportCard
                ).join("");


        } catch (error) {

            console.error(
                "My reports error:",
                error
            );


            reportsList.innerHTML = `
                <div class="error-state">
                    Unable to load reports.
                    Please try again.
                </div>
            `;
        }
    }


    /* =========================================================
       MY REPORT CARD
    ========================================================= */

    function createMyReportCard(complaint) {

        return `
            <article class="my-report-card">

                <div class="my-report-header">

                    <div>

                        <span class="report-id">
                            ${escapeHTML(
                                complaint.complaintId
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                complaint.category
                            )}
                        </h3>

                    </div>

                    <span class="
                        status-badge
                        ${statusClass(
                            complaint.status
                        )}
                    ">
                        ${escapeHTML(
                            complaint.status
                        )}
                    </span>

                </div>


                <div class="my-report-details">

                    <p>
                        ${escapeHTML(
                            complaint.description
                        )}
                    </p>

                    <div>
                        📍 ${escapeHTML(
                            complaint.location
                        )}
                    </div>

                    <div>
                        🕒 ${formatDate(
                            complaint.createdAt
                        )}
                    </div>

                </div>


                ${createCitizenIntelligence(
                    complaint
                )}


                ${createTimeline(
                    complaint
                )}

            </article>
        `;
    }


    /* =========================================================
       ADMIN DASHBOARD
    ========================================================= */

    const complaintsContainer =
        document.getElementById(
            "complaintsContainer"
        );


    /*
     * The upgraded admin-dashboard.html contains its own
     * dashboard logic.
     *
     * Therefore we only execute the legacy admin logic
     * when the upgraded command-center elements are absent.
     */

    if (
        complaintsContainer &&
        !document.querySelector(
            ".admin-command-center"
        )
    ) {

        loadLegacyAdminDashboard();
    }


    async function loadLegacyAdminDashboard() {

        try {

            allComplaints =
                await getComplaints();


            updateLegacyAdminStats();

            renderLegacyAdminComplaints();


        } catch (error) {

            console.error(
                "Admin dashboard error:",
                error
            );


            complaintsContainer.innerHTML = `
                <div class="admin-empty">

                    <h3>
                        Unable to load complaints
                    </h3>

                    <p>
                        Check the CivicHYD server connection.
                    </p>

                </div>
            `;
        }
    }


    function updateLegacyAdminStats() {

        const total =
            allComplaints.length;


        const submitted =
            allComplaints.filter(
                c => c.status === "Submitted"
            ).length;


        const review =
            allComplaints.filter(
                c => c.status === "Under Review"
            ).length;


        const progress =
            allComplaints.filter(
                c => c.status === "In Progress"
            ).length;


        const resolved =
            allComplaints.filter(
                c => c.status === "Resolved"
            ).length;


        setText(
            "adminTotal",
            total
        );

        setText(
            "adminSubmitted",
            submitted
        );

        setText(
            "adminReview",
            review
        );

        setText(
            "adminProgress",
            progress
        );

        setText(
            "adminResolved",
            resolved
        );
    }


    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }


    function renderLegacyAdminComplaints() {

        if (!complaintsContainer) {
            return;
        }


        if (!allComplaints.length) {

            complaintsContainer.innerHTML = `
                <div class="admin-empty">

                    <h3>
                        No complaints yet
                    </h3>

                    <p>
                        Citizen reports will appear here.
                    </p>

                </div>
            `;

            return;
        }


        complaintsContainer.innerHTML =
            allComplaints.map(
                complaint =>
                    createLegacyAdminCard(
                        complaint
                    )
            ).join("");
    }


    function createLegacyAdminCard(
        complaint
    ) {

        return `
            <article class="admin-complaint">

                <div class="complaint-info">

                    <div>

                        <strong>
                            ${escapeHTML(
                                complaint.complaintId
                            )}
                        </strong>

                        <h3>
                            ${escapeHTML(
                                complaint.category
                            )}
                        </h3>

                    </div>

                    <span class="status-badge">
                        ${escapeHTML(
                            complaint.status
                        )}
                    </span>

                    <p>
                        ${escapeHTML(
                            complaint.description
                        )}
                    </p>

                    <p>
                        📍 ${escapeHTML(
                            complaint.location
                        )}
                    </p>

                </div>

                <div class="admin-actions">

                    <select
                        class="legacy-status-select"
                        data-id="${escapeHTML(
                            complaint.complaintId
                        )}"
                    >

                        ${[
                            "Submitted",
                            "Under Review",
                            "In Progress",
                            "Resolved",
                            "Rejected"
                        ].map(
                            status => `
                                <option
                                    value="${escapeHTML(status)}"
                                    ${
                                        status ===
                                        complaint.status
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${status}
                                </option>
                            `
                        ).join("")}

                    </select>

                    <button
                        class="legacy-update-btn"
                        data-id="${escapeHTML(
                            complaint.complaintId
                        )}"
                    >
                        Update
                    </button>

                </div>

            </article>
        `;
    }


    /* =========================================================
       LEGACY ADMIN STATUS UPDATE
    ========================================================= */

    document.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    ".legacy-update-btn"
                );


            if (!button) return;


            const complaintId =
                button.dataset.id;


            const select =
                document.querySelector(
                    `.legacy-status-select[data-id="${CSS.escape(
                        complaintId
                    )}"]`
                );


            if (!select) return;


            try {

                const response =
                    await fetch(
                        `${API_URL}/${encodeURIComponent(
                            complaintId
                        )}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                status:
                                    select.value,

                                note:
                                    "Status updated by administrator"

                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Update failed"
                    );
                }


                alert(
                    "Complaint status updated."
                );


                loadLegacyAdminDashboard();


            } catch (error) {

                console.error(
                    error
                );


                alert(
                    "Unable to update complaint."
                );
            }
        }
    );


    /* =========================================================
       HOME MAP
    ========================================================= */

    const mapElement =
        document.getElementById(
            "civicMap"
        );


    if (
        mapElement &&
        typeof L !== "undefined"
    ) {

        initializeCivicMap();
    }


    async function initializeCivicMap() {

        try {

            const map =
                L.map(
                    "civicMap"
                ).setView(
                    [17.3850, 78.4867],
                    11
                );


            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution:
                        "&copy; OpenStreetMap contributors"
                }
            ).addTo(map);


            const complaints =
                await getComplaints();


            const markerGroups = {};


            complaints.forEach(
                complaint => {

                    const coordinates =
                        complaint.latitude !== null &&
                        complaint.longitude !== null

                            ? [
                                complaint.latitude,
                                complaint.longitude
                              ]

                            : parseCoordinates(
                                complaint.location
                            );


                    if (!coordinates) {
                        return;
                    }


                    /*
                     * Group nearby complaints visually.
                     */

                    const clusterKey =
                        getApproximateClusterKey(
                            coordinates[0],
                            coordinates[1]
                        );


                    if (
                        !markerGroups[
                            clusterKey
                        ]
                    ) {

                        markerGroups[
                            clusterKey
                        ] = [];
                    }


                    markerGroups[
                        clusterKey
                    ].push(
                        complaint
                    );
                }
            );


            Object.values(
                markerGroups
            ).forEach(
                group => {

                    const first =
                        group[0];


                    const coordinates =
                        first.latitude !== null &&
                        first.longitude !== null

                            ? [
                                first.latitude,
                                first.longitude
                              ]

                            : parseCoordinates(
                                first.location
                            );


                    if (!coordinates) {
                        return;
                    }


                    const marker =
                        L.marker(
                            coordinates
                        ).addTo(map);


                    marker.bindPopup(
                        createMapPopup(
                            group
                        )
                    );
                }
            );


        } catch (error) {

            console.error(
                "Map error:",
                error
            );
        }
    }


    /* =========================================================
       MAP CLUSTER KEY
    ========================================================= */

    function getApproximateClusterKey(
        lat,
        lng
    ) {

        /*
         * Rough geographic grouping for the map.
         *
         * This is only a visualization aid.
         * The actual cluster information comes from the backend.
         */

        return [
            Math.round(lat * 100) / 100,
            Math.round(lng * 100) / 100
        ].join("_");
    }


    /* =========================================================
       MAP POPUP
    ========================================================= */

    function createMapPopup(
        complaints
    ) {

        const first =
            complaints[0];


        let html = `

            <div style="
                min-width:220px;
                font-family:Arial,sans-serif;
            ">

                <strong style="
                    font-size:14px;
                ">
                    ${escapeHTML(
                        first.category
                    )}
                </strong>

        `;


        if (complaints.length > 1) {

            html += `

                <div style="
                    margin-top:6px;
                    font-size:12px;
                    color:#555;
                ">
                    ${complaints.length}
                    nearby reports
                </div>

            `;
        }


        complaints
            .slice(0, 5)
            .forEach(
                complaint => {

                    html += `

                        <div style="
                            margin-top:10px;
                            padding-top:8px;
                            border-top:1px solid #eee;
                        ">

                            <strong>
                                ${escapeHTML(
                                    complaint.complaintId
                                )}
                            </strong>

                            <div style="
                                margin-top:3px;
                                font-size:12px;
                            ">
                                ${escapeHTML(
                                    complaint.status
                                )}
                            </div>

                            ${
                                complaint.priority
                                    ? `
                                        <div style="
                                            margin-top:3px;
                                            font-size:11px;
                                        ">
                                            Priority:
                                            ${escapeHTML(
                                                complaint.priority
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                        </div>
                    `;
                }
            );


        html += `
            </div>
        `;


        return html;
    }


    /* =========================================================
       INITIAL HOME STATS
    ========================================================= */

    updateHomeStats();

});