/* =========================================================
   CivicHYD — Main Frontend JavaScript
   Backend: Node.js + Express + MongoDB
   ========================================================= */

const API_URL = "/api/complaints";

/* =========================================================
   COMMON HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
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
    .replace(/\s+/g, "-");
}

function priorityClass(priority) {
  return String(priority || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getComplaintStatus(complaint) {
  return complaint?.status || "Submitted";
}

function getPriority(complaint) {
  return (
    complaint?.priority ||
    (Number(complaint?.severityScore) >= 70
      ? "High"
      : Number(complaint?.severityScore) >= 50
        ? "Medium"
        : "Low")
  );
}

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {
  const menuButton = document.querySelector(".mobile-menu");
  const nav = document.querySelector(".main-nav");

  if (!menuButton || !nav) return;

  menuButton.addEventListener("click", () => {
    nav.classList.toggle("mobile-open");
    menuButton.classList.toggle("active");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("mobile-open");
      menuButton.classList.remove("active");
    });
  });
}

/* =========================================================
   HOME — CITY STATS
   ========================================================= */

async function loadHomeStats() {
  const totalElement = $("totalReports");
  const progressElement = $("progressReports");
  const resolvedElement = $("resolvedReports");
  const hotspotElement = $("heroHotspots");

  const heroReports = $("heroCityReports");

  const elementsExist =
    totalElement ||
    progressElement ||
    resolvedElement ||
    hotspotElement ||
    heroReports;

  if (!elementsExist) return;

  try {
    const response = await fetch("/api/analytics");

    if (!response.ok) {
      throw new Error("Analytics request failed");
    }

    const data = await response.json();

    /*
      Backend may return different property names depending
      on the analytics implementation. Handle common forms.
    */

    const total =
      data.totalReports ??
      data.total ??
      data.totalComplaints ??
      0;

    const resolved =
      data.resolvedReports ??
      data.resolved ??
      data.statusCounts?.Resolved ??
      0;

    const progress =
      data.progressReports ??
      data.inProgress ??
      data.statusCounts?.["In Progress"] ??
      0;

    const hotspots =
      data.hotspots ??
      data.hotspotCount ??
      data.clusters ??
      0;

    if (totalElement) {
      totalElement.textContent = Number(total).toLocaleString("en-IN");
    }

    if (progressElement) {
      progressElement.textContent =
        Number(progress).toLocaleString("en-IN");
    }

    if (resolvedElement) {
      resolvedElement.textContent =
        Number(resolved).toLocaleString("en-IN");
    }

    if (hotspotElement) {
      hotspotElement.textContent =
        Number(hotspots).toLocaleString("en-IN");
    }

    if (heroReports) {
      heroReports.textContent =
        Number(total).toLocaleString("en-IN");
    }
  } catch (error) {
    console.warn("Home analytics unavailable:", error);

    /*
      Do not show fake statistics.
      Keep existing HTML values if API is unavailable.
    */
  }
}

/* =========================================================
   HOME — CIVIC MAP
   ========================================================= */

let civicHomeMap = null;
let civicHomeMarkers = [];

async function initializeHomeMap() {
  const mapElement = $("civicMap");

  if (!mapElement) return;

  if (typeof L === "undefined") {
    console.error("Leaflet is not loaded.");
    mapElement.innerHTML = `
      <div style="
        padding:24px;
        text-align:center;
        color:#64748b;
        font-family:Arial,sans-serif;
      ">
        Map library could not be loaded.
      </div>
    `;
    return;
  }

  /*
    Prevent Leaflet from being initialized twice.
  */

  if (civicHomeMap) {
    civicHomeMap.invalidateSize();
    return;
  }

  try {
    civicHomeMap = L.map(mapElement, {
      center: [17.3850, 78.4867],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    ).addTo(civicHomeMap);

    /*
      Give Leaflet time to calculate the container size.
      This fixes the common "map is blank/grey" issue when
      the map is inside a dynamically styled section.
    */

    setTimeout(() => {
      if (civicHomeMap) {
        civicHomeMap.invalidateSize();
      }
    }, 250);

    await loadHomeComplaintMarkers();

    setTimeout(() => {
      if (civicHomeMap) {
        civicHomeMap.invalidateSize();
      }
    }, 500);
  } catch (error) {
    console.error("Home map initialization failed:", error);
  }
}

/* =========================================================
   HOME — LOAD COMPLAINT LOCATIONS
   ========================================================= */

async function loadHomeComplaintMarkers() {
  if (!civicHomeMap) return;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Complaint API failed");
    }

    const data = await response.json();

    const complaints = Array.isArray(data)
      ? data
      : data.complaints || data.data || [];

    /*
      Clear old markers if this function is called again.
    */

    civicHomeMarkers.forEach((marker) => {
      civicHomeMap.removeLayer(marker);
    });

    civicHomeMarkers = [];

    const validComplaints = complaints.filter((complaint) => {
      const lat = Number(
        complaint.latitude ??
        complaint.lat
      );

      const lng = Number(
        complaint.longitude ??
        complaint.lng
      );

      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });

    validComplaints.forEach((complaint) => {
      const lat = Number(
        complaint.latitude ??
        complaint.lat
      );

      const lng = Number(
        complaint.longitude ??
        complaint.lng
      );

      const status = getComplaintStatus(complaint);
      const priority = getPriority(complaint);

      const popup = `
        <div style="
          min-width:220px;
          font-family:Arial,sans-serif;
          line-height:1.5;
        ">
          <div style="
            font-size:11px;
            font-weight:700;
            letter-spacing:.08em;
            color:#64748b;
            margin-bottom:5px;
          ">
            CIVICHYD REPORT
          </div>

          <div style="
            font-size:15px;
            font-weight:700;
            color:#0f172a;
            margin-bottom:8px;
          ">
            ${escapeHTML(
              complaint.category || "Civic Issue"
            )}
          </div>

          <div style="
            font-size:12px;
            color:#475569;
            margin-bottom:10px;
          ">
            ${escapeHTML(
              complaint.description || "No description"
            ).slice(0, 140)}
          </div>

          <div style="
            display:flex;
            gap:6px;
            flex-wrap:wrap;
          ">
            <span style="
              padding:3px 7px;
              border-radius:4px;
              background:#f1f5f9;
              color:#334155;
              font-size:11px;
              font-weight:700;
            ">
              ${escapeHTML(status)}
            </span>

            <span style="
              padding:3px 7px;
              border-radius:4px;
              background:#f1f5f9;
              color:#334155;
              font-size:11px;
              font-weight:700;
            ">
              ${escapeHTML(priority)}
            </span>
          </div>

          <div style="
            margin-top:9px;
            font-size:11px;
            color:#64748b;
          ">
            ${escapeHTML(
              complaint.complaintId || ""
            )}
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng])
        .addTo(civicHomeMap)
        .bindPopup(popup);

      civicHomeMarkers.push(marker);
    });

    /*
      If there are no valid coordinates, keep Hyderabad
      map visible instead of making the section look broken.
    */

    if (validComplaints.length > 0) {
      const bounds = L.latLngBounds(
        validComplaints.map((complaint) => [
          Number(
            complaint.latitude ??
            complaint.lat
          ),
          Number(
            complaint.longitude ??
            complaint.lng
          )
        ])
      );

      /*
        Only fit bounds when there are enough reports.
        Otherwise Hyderabad remains the main view.
      */

      if (validComplaints.length >= 2) {
        civicHomeMap.fitBounds(bounds, {
          padding: [35, 35],
          maxZoom: 14
        });
      }
    }
  } catch (error) {
    console.warn(
      "Could not load complaint locations:",
      error
    );
  }
}

/* =========================================================
   HOME — QUICK TRACK
   ========================================================= */

function setupHomeTracking() {
  const trackButton = $("trackButton");
  const mobileInput = $("trackMobileNumber");
  const result = $("trackingResult");

  if (!trackButton || !mobileInput || !result) return;

  async function trackReports() {
    const mobile = mobileInput.value.trim();

    if (!mobile) {
      result.innerHTML = `
        <div class="tracking-message error">
          Please enter your mobile number.
        </div>
      `;
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "");

    if (cleanMobile.length !== 10) {
      result.innerHTML = `
        <div class="tracking-message error">
          Enter a valid 10-digit mobile number.
        </div>
      `;
      return;
    }

    trackButton.disabled = true;
    trackButton.textContent = "Tracking…";

    result.innerHTML = `
      <div class="tracking-message">
        Checking your reports…
      </div>
    `;

    try {
      const response = await fetch(
        `${API_URL}/mobile/${encodeURIComponent(cleanMobile)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to find reports."
        );
      }

      const reports = Array.isArray(data)
        ? data
        : data.complaints || data.data || [];

      renderHomeTrackingResults(reports, result);
    } catch (error) {
      result.innerHTML = `
        <div class="tracking-message error">
          ${escapeHTML(
            error.message || "Could not find reports."
          )}
        </div>
      `;
    } finally {
      trackButton.disabled = false;
      trackButton.textContent = "Track";
    }
  }

  trackButton.addEventListener("click", trackReports);

  mobileInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      trackReports();
    }
  });

  mobileInput.addEventListener("input", () => {
    mobileInput.value = mobileInput.value
      .replace(/\D/g, "")
      .slice(0, 10);
  });
}

function renderHomeTrackingResults(reports, container) {
  if (!reports.length) {
    container.innerHTML = `
      <div class="tracking-message">
        No reports found for this mobile number.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="tracking-results">
      ${reports
        .map((report) => {
          const status = getComplaintStatus(report);
          const priority = getPriority(report);

          return `
            <article class="tracking-item">
              <div class="tracking-item-main">
                <div class="tracking-item-id">
                  ${escapeHTML(
                    report.complaintId || "—"
                  )}
                </div>

                <div class="tracking-item-category">
                  ${escapeHTML(
                    report.category || "Civic Issue"
                  )}
                </div>

                <div class="tracking-item-date">
                  Submitted ${formatDate(
                    report.createdAt
                  )}
                </div>
              </div>

              <div class="tracking-item-meta">
                <span class="status-badge ${statusClass(status)}">
                  ${escapeHTML(status)}
                </span>

                <span class="priority-badge ${priorityClass(priority)}">
                  ${escapeHTML(priority)}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

/* =========================================================
   REPORT PAGE — FORM
   ========================================================= */

function setupReportPage() {
  const form = $("reportForm");

  if (!form) return;

  const category = $("issueCategory");
  const description = $("issueDescription");
  const location = $("issueLocation");
  const photo = $("issuePhoto");
  const photoPreview = $("photoPreview");
  const name = $("issueName");
  const mobile = $("issueMobile");
  const latitude = $("latitude");
  const longitude = $("longitude");
  const getLocationButton = $("getLocationButton");

  /* ---------- URL CATEGORY ---------- */

  const params = new URLSearchParams(window.location.search);
  const categoryFromURL = params.get("category");

  if (
    categoryFromURL &&
    category &&
    !category.value
  ) {
    const matchingOption = [
      ...category.options
    ].find(
      (option) =>
        option.value.toLowerCase() ===
        categoryFromURL.toLowerCase()
    );

    if (matchingOption) {
      category.value = matchingOption.value;
    }
  }

  /* ---------- DESCRIPTION COUNTER ---------- */

  if (description) {
    const counter =
      document.querySelector(
        "[data-description-count]"
      ) ||
      document.querySelector(
        ".description-count"
      );

    const updateCounter = () => {
      if (counter) {
        counter.textContent =
          `${description.value.length}/500`;
      }
    };

    description.addEventListener(
      "input",
      updateCounter
    );

    updateCounter();
  }

  /* ---------- MOBILE INPUT ---------- */

  if (mobile) {
    mobile.addEventListener("input", () => {
      mobile.value = mobile.value
        .replace(/\D/g, "")
        .slice(0, 10);
    });
  }

  /* ---------- PHOTO PREVIEW ---------- */

  if (photo && photoPreview) {
    photo.addEventListener("change", () => {
      const file = photo.files?.[0];

      if (!file) {
        photoPreview.innerHTML = "";
        photoPreview.classList.remove("has-image");
        return;
      }

      if (!file.type.startsWith("image/")) {
        photo.value = "";
        photoPreview.innerHTML = `
          <div class="preview-error">
            Please select an image file.
          </div>
        `;
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        photo.value = "";
        photoPreview.innerHTML = `
          <div class="preview-error">
            Image must be smaller than 5 MB.
          </div>
        `;
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        photoPreview.innerHTML = `
          <img
            src="${event.target.result}"
            alt="Selected civic issue evidence"
          />
        `;

        photoPreview.classList.add("has-image");
      };

      reader.readAsDataURL(file);
    });
  }

  /* ---------- LOCATION ---------- */

  if (getLocationButton) {
    getLocationButton.addEventListener(
      "click",
      () => {
        if (!navigator.geolocation) {
          alert(
            "Location services are not supported by this browser."
          );
          return;
        }

        getLocationButton.disabled = true;
        getLocationButton.textContent =
          "Getting location…";

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat =
              position.coords.latitude;

            const lng =
              position.coords.longitude;

            if (latitude) {
              latitude.value = lat;
            }

            if (longitude) {
              longitude.value = lng;
            }

            if (location) {
              location.value =
                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }

            getLocationButton.disabled = false;
            getLocationButton.textContent =
              "Location captured";
          },
          (error) => {
            console.warn(
              "Geolocation error:",
              error
            );

            getLocationButton.disabled = false;
            getLocationButton.textContent =
              "Use my location";

            alert(
              "Could not access your location. Please enter the location manually."
            );
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

  /* ---------- FORM SUBMIT ---------- */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton =
      form.querySelector(
        'button[type="submit"]'
      );

    const originalButtonText =
      submitButton?.textContent ||
      "Submit Report";

    const categoryValue =
      category?.value.trim() || "";

    const descriptionValue =
      description?.value.trim() || "";

    const locationValue =
      location?.value.trim() || "";

    const nameValue =
      name?.value.trim() || "";

    const mobileValue =
      mobile?.value.trim() || "";

    if (!categoryValue) {
      alert("Please select an issue category.");
      category?.focus();
      return;
    }

    if (
      !descriptionValue ||
      descriptionValue.length < 10
    ) {
      alert(
        "Please provide a little more detail about the issue."
      );
      description?.focus();
      return;
    }

    if (!locationValue) {
      alert("Please provide the issue location.");
      location?.focus();
      return;
    }

    if (
      !mobileValue ||
      mobileValue.replace(/\D/g, "").length !== 10
    ) {
      alert(
        "Please enter a valid 10-digit mobile number."
      );
      mobile?.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent =
      "Submitting…";

    try {
      let imageData = "";

      if (photo?.files?.[0]) {
        imageData =
          await convertFileToBase64(
            photo.files[0]
          );
      }

      const payload = {
        name: nameValue,
        mobile: mobileValue.replace(/\D/g, ""),
        category: categoryValue,
        description: descriptionValue,
        location: locationValue,
        image: imageData
      };

      /*
        Send coordinates separately when available.
        Backend can use location text too.
      */

      if (
        latitude?.value &&
        longitude?.value
      ) {
        payload.latitude =
          Number(latitude.value);

        payload.longitude =
          Number(longitude.value);
      }

      const response = await fetch(
        API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Unable to submit the report."
        );
      }

      showReportSuccess(data);

      form.reset();

      if (photoPreview) {
        photoPreview.innerHTML = "";
        photoPreview.classList.remove(
          "has-image"
        );
      }
    } catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );

      alert(
        error.message ||
        "Something went wrong while submitting the report."
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent =
        originalButtonText;
    }
  });
}

/* =========================================================
   IMAGE → BASE64
   ========================================================= */

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        new Error("Could not read image.")
      );
    };

    reader.readAsDataURL(file);
  });
}

/* =========================================================
   REPORT SUCCESS
   ========================================================= */

function showReportSuccess(data) {
  const success = $("reportSuccess");

  if (!success) {
    alert(
      `Report submitted successfully.\nComplaint ID: ${
        data.complaintId || "Generated"
      }`
    );
    return;
  }

  const complaintId =
    data.complaintId ||
    data.complaint?.complaintId ||
    "Generated";

  const summary =
    data.summary ||
    data.complaint ||
    {};

  const severity =
    summary.severity ??
    summary.severityScore ??
    data.severityScore ??
    data.complaint?.severityScore;

  const priority =
    summary.priority ||
    data.priority ||
    data.complaint?.priority ||
    "";

  const department =
    summary.department ||
    data.department ||
    data.complaint?.department ||
    "";

  const intelligence =
    $("submissionIntelligence");

  const complaintIdElements =
    success.querySelectorAll(
      "[data-complaint-id]"
    );

  complaintIdElements.forEach((element) => {
    element.textContent = complaintId;
  });

  if (intelligence) {
    const details = [];

    if (severity !== undefined) {
      details.push(
        `<div>
          <strong>Severity</strong>
          <span>${escapeHTML(severity)}/100</span>
        </div>`
      );
    }

    if (priority) {
      details.push(
        `<div>
          <strong>Priority</strong>
          <span>${escapeHTML(priority)}</span>
        </div>`
      );
    }

    if (department) {
      details.push(
        `<div>
          <strong>Routed to</strong>
          <span>${escapeHTML(department)}</span>
        </div>`
      );
    }

    if (
      summary.duplicate ||
      data.duplicate ||
      data.duplicateOf
    ) {
      details.push(
        `<div>
          <strong>Duplicate check</strong>
          <span>Possible related report found</span>
        </div>`
      );
    }

    if (
      summary.cluster ||
      data.cluster ||
      data.clusterId
    ) {
      details.push(
        `<div>
          <strong>Geographic signal</strong>
          <span>Nearby reports linked</span>
        </div>`
      );
    }

    intelligence.innerHTML =
      details.length
        ? details.join("")
        : `
          <div>
            <strong>Report recorded</strong>
            <span>Your complaint is now traceable.</span>
          </div>
        `;
  }

  success.hidden = false;

  success.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =========================================================
   MY REPORTS — LOOKUP
   ========================================================= */

function setupMyReportsPage() {
  const mobileForm =
    $("mobileLookupForm");

  const complaintForm =
    $("complaintLookupForm");

  const reportsContainer =
    $("reportsContainer");

  const detailView =
    $("reportDetailView");

  const backButton =
    $("backToReports");

  /*
    Page-specific script should only run if this
    is actually the My Reports page.
  */

  if (
    !mobileForm &&
    !complaintForm &&
    !reportsContainer
  ) {
    return;
  }

  if (mobileForm) {
    mobileForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const input =
          $("lookupMobile");

        const button =
          $("lookupButton");

        const message =
          $("lookupMessage");

        const mobile =
          input?.value
            .trim()
            .replace(/\D/g, "");

        if (!mobile || mobile.length !== 10) {
          if (message) {
            message.textContent =
              "Enter a valid 10-digit mobile number.";
            message.className =
              "lookup-message error";
          }

          return;
        }

        if (button) {
          button.disabled = true;
          button.textContent =
            "Searching…";
        }

        if (message) {
          message.textContent =
            "Finding your reports…";
          message.className =
            "lookup-message";
        }

        try {
          const response = await fetch(
            `${API_URL}/mobile/${encodeURIComponent(mobile)}`
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
              "Could not find reports."
            );
          }

          const reports =
            Array.isArray(data)
              ? data
              : data.complaints ||
                data.data ||
                [];

          renderMyReports(
            reports,
            reportsContainer
          );

          if (message) {
            message.textContent =
              reports.length
                ? `${reports.length} report${
                    reports.length === 1
                      ? ""
                      : "s"
                  } found.`
                : "No reports found.";
            message.className =
              reports.length
                ? "lookup-message success"
                : "lookup-message";
          }
        } catch (error) {
          if (message) {
            message.textContent =
              error.message ||
              "Unable to retrieve reports.";
            message.className =
              "lookup-message error";
          }
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent =
              "Track";
          }
        }
      }
    );
  }

  if (complaintForm) {
    complaintForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const input =
          $("lookupComplaintId");

        const button =
          $("lookupComplaintButton");

        const message =
          $("lookupComplaintMessage");

        const complaintId =
          input?.value.trim();

        if (!complaintId) {
          if (message) {
            message.textContent =
              "Enter a complaint ID.";
            message.className =
              "lookup-message error";
          }

          return;
        }

        if (button) {
          button.disabled = true;
          button.textContent =
            "Searching…";
        }

        try {
          const response = await fetch(
            `${API_URL}/${encodeURIComponent(
              complaintId
            )}`
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
              "Complaint not found."
            );
          }

          const complaint =
            data.complaint ||
            data.data ||
            data;

          showReportDetail(
            complaint,
            reportsContainer,
            detailView
          );

          if (message) {
            message.textContent =
              "Complaint found.";
            message.className =
              "lookup-message success";
          }
        } catch (error) {
          if (message) {
            message.textContent =
              error.message ||
              "Complaint not found.";
            message.className =
              "lookup-message error";
          }
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent =
              "Track";
          }
        }
      }
    );
  }

  if (backButton) {
    backButton.addEventListener(
      "click",
      () => {
        if (detailView) {
          detailView.hidden = true;
        }

        if (reportsContainer) {
          reportsContainer.hidden = false;
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }
}

/* =========================================================
   MY REPORTS — RESULT CARDS
   ========================================================= */

function renderMyReports(
  reports,
  container
) {
  if (!container) return;

  container.hidden = false;

  if (!reports.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">
          No reports found
        </div>

        <p>
          We could not find any CivicHYD reports
          for the details provided.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="reports-list">
      ${reports
        .map(
          (report) => `
            <button
              type="button"
              class="report-result-card"
              data-report-id="${escapeHTML(
                report.complaintId || ""
              )}"
            >
              <div class="report-result-main">
                <div class="report-result-id">
                  ${escapeHTML(
                    report.complaintId || "—"
                  )}
                </div>

                <h3>
                  ${escapeHTML(
                    report.category ||
                      "Civic Issue"
                  )}
                </h3>

                <p>
                  ${escapeHTML(
                    report.description ||
                      "No description"
                  ).slice(0, 180)}
                </p>

                <small>
                  ${formatDate(
                    report.createdAt
                  )}
                </small>
              </div>

              <div class="report-result-status">
                <span class="status-badge ${statusClass(
                  getComplaintStatus(report)
                )}">
                  ${escapeHTML(
                    getComplaintStatus(report)
                  )}
                </span>

                <span class="priority-badge ${priorityClass(
                  getPriority(report)
                )}">
                  ${escapeHTML(
                    getPriority(report)
                  )}
                </span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;

  container
    .querySelectorAll(
      "[data-report-id]"
    )
    .forEach((card) => {
      card.addEventListener(
        "click",
        () => {
          const complaintId =
            card.dataset.reportId;

          loadReportDetail(
            complaintId,
            container
          );
        }
      );
    });
}

/* =========================================================
   MY REPORTS — DETAIL
   ========================================================= */

async function loadReportDetail(
  complaintId,
  resultsContainer
) {
  const detailView =
    $("reportDetailView");

  const detailContainer =
    $("reportDetailContainer");

  if (!detailView || !detailContainer) {
    return;
  }

  detailContainer.innerHTML = `
    <div class="detail-loading">
      Loading complaint details…
    </div>
  `;

  detailView.hidden = false;

  if (resultsContainer) {
    resultsContainer.hidden = true;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  try {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(
        complaintId
      )}`
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Unable to load complaint."
      );
    }

    const complaint =
      data.complaint ||
      data.data ||
      data;

    showReportDetail(
      complaint,
      resultsContainer,
      detailView
    );
  } catch (error) {
    detailContainer.innerHTML = `
      <div class="detail-error">
        ${escapeHTML(
          error.message ||
            "Unable to load complaint details."
        )}
      </div>
    `;
  }
}

function showReportDetail(
  complaint,
  resultsContainer,
  detailView
) {
  const container =
    $("reportDetailContainer");

  if (!container || !detailView) return;

  if (resultsContainer) {
    resultsContainer.hidden = true;
  }

  detailView.hidden = false;

  const status =
    getComplaintStatus(complaint);

  const priority =
    getPriority(complaint);

  const severity =
    complaint.severityScore ??
    complaint.severity ??
    "—";

  const history =
    Array.isArray(
      complaint.statusHistory
    )
      ? complaint.statusHistory
      : [];

  const reasons =
    Array.isArray(
      complaint.severityReasons
    )
      ? complaint.severityReasons
      : [];

  const resolution =
    complaint.resolutionProof;

  container.innerHTML = `
    <div class="report-detail-header">
      <div>
        <div class="detail-eyebrow">
          CIVICHYD COMPLAINT
        </div>

        <h2>
          ${escapeHTML(
            complaint.complaintId ||
              "Complaint"
          )}
        </h2>
      </div>

      <div class="detail-badges">
        <span class="status-badge ${statusClass(
          status
        )}">
          ${escapeHTML(status)}
        </span>

        <span class="priority-badge ${priorityClass(
          priority
        )}">
          ${escapeHTML(priority)}
        </span>
      </div>
    </div>

    <div class="detail-description">
      <div class="detail-section-label">
        ISSUE
      </div>

      <h3>
        ${escapeHTML(
          complaint.category ||
            "Civic Issue"
        )}
      </h3>

      <p>
        ${escapeHTML(
          complaint.description ||
            "No description provided."
        )}
      </p>
    </div>

    <div class="detail-info-grid">
      ${detailInfo(
        "Department",
        complaint.department
      )}

      ${detailInfo(
        "Location",
        complaint.location
      )}

      ${detailInfo(
        "Citizen",
        complaint.name
      )}

      ${detailInfo(
        "Submitted",
        formatDateTime(
          complaint.createdAt
        )
      )}

      ${detailInfo(
        "Priority",
        priority
      )}

      ${detailInfo(
        "Severity Score",
        severity === "—"
          ? "—"
          : `${severity}/100`
      )}
    </div>

    ${
      history.length
        ? `
      <section class="detail-section">
        <div class="detail-section-label">
          STATUS TIMELINE
        </div>

        <div class="status-timeline">
          ${history
            .map(
              (item, index) => `
                <div class="timeline-item ${
                  index ===
                  history.length - 1
                    ? "current"
                    : ""
                }">
                  <div class="timeline-dot"></div>

                  <div class="timeline-content">
                    <strong>
                      ${escapeHTML(
                        item.status ||
                          "Updated"
                      )}
                    </strong>

                    <span>
                      ${formatDateTime(
                        item.changedAt ||
                          item.timestamp ||
                          item.createdAt
                      )}
                    </span>

                    ${
                      item.note
                        ? `<p>${escapeHTML(
                            item.note
                          )}</p>`
                        : ""
                    }
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `
        : ""
    }

    <section class="detail-section intelligence-detail">
      <div class="detail-section-label">
        CIVIC INTELLIGENCE
      </div>

      <div class="intelligence-detail-grid">

        <div class="intelligence-detail-card">
          <div class="intelligence-card-title">
            Severity Assessment
          </div>

          <div class="severity-value">
            ${
              severity === "—"
                ? "—"
                : `${escapeHTML(
                    severity
                  )}/100`
            }
          </div>

          ${
            reasons.length
              ? `
                <ul class="severity-reasons">
                  ${reasons
                    .map(
                      (reason) =>
                        `<li>${escapeHTML(
                          reason
                        )}</li>`
                    )
                    .join("")}
                </ul>
              `
              : `
                <p>
                  Assessment is based on
                  explainable civic rules.
                </p>
              `
          }
        </div>

        <div class="intelligence-detail-card">
          <div class="intelligence-card-title">
            Duplicate Check
          </div>

          ${
            complaint.duplicateOf
              ? `
                <strong>
                  Related report detected
                </strong>

                <p>
                  ${escapeHTML(
                    complaint.duplicateReason ||
                      "This report may relate to an existing report."
                  )}
                </p>

                <small>
                  ${escapeHTML(
                    complaint.duplicateOf
                  )}
                </small>
              `
              : `
                <strong>
                  No linked duplicate
                </strong>

                <p>
                  No sufficiently similar existing
                  report was linked.
                </p>
              `
          }
        </div>

        <div class="intelligence-detail-card">
          <div class="intelligence-card-title">
            Geographic Cluster
          </div>

          ${
            complaint.clusterId
              ? `
                <strong>
                  ${escapeHTML(
                    complaint.clusterId
                  )}
                </strong>

                <p>
                  Nearby reports may indicate
                  a shared civic hotspot.
                </p>
              `
              : `
                <strong>
                  No cluster assigned
                </strong>

                <p>
                  No nearby civic cluster was
                  identified.
                </p>
              `
          }
        </div>

        <div class="intelligence-detail-card">
          <div class="intelligence-card-title">
            Department Routing
          </div>

          <strong>
            ${escapeHTML(
              complaint.department ||
                "Civic General"
            )}
          </strong>

          <p>
            ${
              escapeHTML(
                complaint.routingReason ||
                  "Routed according to issue category."
              )
            }
          </p>
        </div>

      </div>
    </section>

    ${
      resolution
        ? `
      <section class="detail-section resolution-detail">
        <div class="detail-section-label">
          RESOLUTION PROOF
        </div>

        <div class="resolution-card">
          ${
            resolution.image
              ? `
                <img
                  src="${escapeHTML(
                    resolution.image
                  )}"
                  alt="Resolution proof"
                />
              `
              : ""
          }

          ${
            resolution.note
              ? `
                <p>
                  ${escapeHTML(
                    resolution.note
                  )}
                </p>
              `
              : ""
          }

          ${
            resolution.resolvedAt
              ? `
                <small>
                  Resolved ${formatDateTime(
                    resolution.resolvedAt
                  )}
                </small>
              `
              : ""
          }
        </div>
      </section>
    `
        : ""
    }
  `;
}

function detailInfo(
  label,
  value
) {
  return `
    <div class="detail-info-item">
      <span>${escapeHTML(label)}</span>
      <strong>
        ${escapeHTML(
          value || "—"
        )}
      </strong>
    </div>
  `;
}

/* =========================================================
   LEAFLET MAPS ON OTHER PAGES
   ========================================================= */

function initializeGenericMap(
  elementId
) {
  const element = $(elementId);

  if (!element || typeof L === "undefined") {
    return null;
  }

  const map = L.map(element, {
    center: [17.3850, 78.4867],
    zoom: 12,
    scrollWheelZoom: false
  });

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 300);

  return map;
}

/* =========================================================
   INITIALIZE PAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMobileNavigation();

    /*
      HOME
    */
    if ($("civicMap")) {
      initializeHomeMap();
    }

    loadHomeStats();
    setupHomeTracking();

    /*
      REPORT PAGE
    */
    if ($("reportForm")) {
      setupReportPage();
    }

    /*
      MY REPORTS
    */
    if (
      $("mobileLookupForm") ||
      $("complaintLookupForm") ||
      $("reportsContainer")
    ) {
      setupMyReportsPage();
    }

    /*
      Fix Leaflet maps after window resize.
    */

    window.addEventListener(
      "resize",
      () => {
        if (civicHomeMap) {
          civicHomeMap.invalidateSize();
        }
      }
    );
  }
);