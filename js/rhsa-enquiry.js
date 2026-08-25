/*
==========================================================
RHSA COMMON ENQUIRY SYSTEM
One shared form for:
1. Course brochure requests
2. Course enquiries
3. Customized training requirements
No enquiry form is placed in the navbar.
==========================================================
*/
(function () {
    "use strict";

    function buildModal() {
        if (document.getElementById("rhsa-enquiry-modal")) return;

        const modal = document.createElement("div");
        modal.id = "rhsa-enquiry-modal";
        modal.className = "rhsa-modal";
        modal.setAttribute("aria-hidden", "true");

        modal.innerHTML = `
            <div class="rhsa-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rhsa-modal-title">
                <button type="button" class="rhsa-modal-close" aria-label="Close">&times;</button>

                <div class="rhsa-modal-header">
                    <span class="section-label">RESILIENT HEALTHCARE SKILL ACADEMY</span>
                    <h2 id="rhsa-modal-title">How can we help?</h2>
                    <p class="rhsa-modal-course" id="rhsa-modal-course"></p>
                </div>

                <form class="rhsa-enquiry-form" id="rhsa-enquiry-form" novalidate>
                    <input type="hidden" name="action" id="rhsa-action" value="enquiry">
                    <input type="hidden" name="course" id="rhsa-course" value="">

                    <div class="form-group" id="rhsa-followup-wrap">
                        <label>What would you like us to do?</label>
                        <div class="rhsa-purpose">
                            <label><input type="radio" name="follow_up" value="answer_query" checked> Answer my query</label>
                            <label><input type="radio" name="follow_up" value="call_back"> Call me back</label>
                            <label><input type="radio" name="follow_up" value="both"> Both</label>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="rhsa-name">Name *</label>
                                <input id="rhsa-name" name="name" class="form-control" type="text" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="rhsa-phone">Contact Number *</label>
                                <input id="rhsa-phone" name="phone" class="form-control" type="tel" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="rhsa-email">Email ID *</label>
                        <input id="rhsa-email" name="email" class="form-control" type="email" required>
                    </div>

                    <div class="form-group" id="rhsa-audience-wrap">
                        <label>I am enquiring as *</label>
                        <div class="rhsa-purpose">
                            <label><input type="radio" name="audience" value="individual" checked> Individual</label>
                            <label><input type="radio" name="audience" value="organisation"> Organisation / Institution</label>
                        </div>
                    </div>

                    <div class="form-group rhsa-hidden" id="rhsa-organisation-wrap">
                        <label for="rhsa-organisation">Organisation / Institution</label>
                        <input id="rhsa-organisation" name="organisation" class="form-control" type="text">
                    </div>

                    <div class="form-group" id="rhsa-course-wrap">
                        <label for="rhsa-course-select">Course / Programme</label>
                        <select id="rhsa-course-select" name="course_select" class="form-control">
                            <option value="">Select course / programme</option>
                            <option>Medical Records Assistant</option>
                            <option>Front Desk Coordinator</option>
                            <option>General Duty Assistant</option>
                            <option>Phlebotomy Technician</option>
                            <option>Communication & Soft Skills Training</option>
                            <option>Infection Control Nurse</option>
                            <option>Biomedical Waste Management</option>
                            <option>Basic Infection Control at Healthcare Setup</option>
                            <option>Basic Sanitization & Infection Control at Workplace</option>
                            <option>Basic Cardiopulmonary Life Support (BCLS)</option>
                            <option>School Health & Wellness Programme</option>
                            <option>Other RHSA Programme</option>
                        </select>
                    </div>

                    <div id="rhsa-custom-fields" class="rhsa-hidden">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="rhsa-designation">Designation *</label>
                                    <input id="rhsa-designation" name="designation" class="form-control" type="text">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="rhsa-custom-org">Organisation / Institution *</label>
                                    <input id="rhsa-custom-org" name="custom_organisation" class="form-control" type="text">
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="rhsa-time">Preferred Time to Connect *</label>
                            <select id="rhsa-time" name="preferred_time" class="form-control">
                                <option value="">Select a convenient time</option>
                                <option>10:00 AM – 12:00 PM</option>
                                <option>12:00 PM – 2:00 PM</option>
                                <option>2:00 PM – 4:00 PM</option>
                                <option>4:00 PM – 6:00 PM</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Would you like to request a one-to-one visit?</label>
                            <div class="rhsa-visit-choice">
                                <label><input type="radio" name="visit_request" value="yes"> Yes, request a visit</label>
                                <label><input type="radio" name="visit_request" value="no" checked> No, connect by phone/email</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" id="rhsa-query-wrap">
                        <label for="rhsa-query">Your Query / Training Requirement</label>
                        <textarea id="rhsa-query" name="query" class="form-control" placeholder="Tell us what you would like to know."></textarea>
                    </div>

                    <div class="form-group rhsa-brochure-note rhsa-hidden" id="rhsa-brochure-note">
                        <p>We will use your details to send the requested brochure to your email.</p>
                    </div>

                    <button type="submit" class="rhsa-submit">Submit</button>
                </form>

                <div class="rhsa-status" id="rhsa-status"></div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".rhsa-modal-close").addEventListener("click", closeModal);
        modal.addEventListener("click", function (e) {
            if (e.target === modal) closeModal();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeModal();
        });

        modal.querySelectorAll('input[name="audience"]').forEach(function (radio) {
            radio.addEventListener("change", toggleOrganisation);
        });

        modal.querySelectorAll('input[name="follow_up"]').forEach(function (radio) {
            radio.addEventListener("change", toggleQuery);
        });

        modal.querySelector("#rhsa-enquiry-form").addEventListener("submit", submitForm);
    }

    function toggleOrganisation() {
        const selected = document.querySelector('input[name="audience"]:checked');
        const wrap = document.getElementById("rhsa-organisation-wrap");
        if (wrap) wrap.classList.toggle("rhsa-hidden", !selected || selected.value !== "organisation");
    }

    function toggleQuery() {
        const action = document.getElementById("rhsa-action").value;
        const selected = document.querySelector('input[name="follow_up"]:checked');
        const wrap = document.getElementById("rhsa-query-wrap");
        if (!wrap) return;
        wrap.classList.toggle("rhsa-hidden", action === "brochure" || (selected && selected.value === "call_back"));
    }

    function openModal(action, course) {
        buildModal();

        const modal = document.getElementById("rhsa-enquiry-modal");
        const form = document.getElementById("rhsa-enquiry-form");
        const courseField = document.getElementById("rhsa-course");
        const courseSelect = document.getElementById("rhsa-course-select");
        const title = document.getElementById("rhsa-modal-title");
        const courseLabel = document.getElementById("rhsa-modal-course");
        const note = document.getElementById("rhsa-brochure-note");
        const queryWrap = document.getElementById("rhsa-query-wrap");
        const followWrap = document.getElementById("rhsa-followup-wrap");
        const audienceWrap = document.getElementById("rhsa-audience-wrap");
        const customFields = document.getElementById("rhsa-custom-fields");
        const courseWrap = document.getElementById("rhsa-course-wrap");
        const submit = form.querySelector(".rhsa-submit");
        const status = document.getElementById("rhsa-status");

        form.reset();
        status.classList.remove("is-visible");
        status.textContent = "";
        document.getElementById("rhsa-action").value = action;

        const isCustom = action === "custom-training";
        const isBrochure = action === "brochure";

        followWrap.classList.toggle("rhsa-hidden", isBrochure || isCustom);
        audienceWrap.classList.toggle("rhsa-hidden", isCustom);
        customFields.classList.toggle("rhsa-hidden", !isCustom);
        courseWrap.classList.toggle("rhsa-hidden", isCustom);
        note.classList.toggle("rhsa-hidden", !isBrochure);

        if (isBrochure) {
            title.textContent = "Download Brochure";
            submit.textContent = "Send Me the Brochure";
            queryWrap.classList.add("rhsa-hidden");
        } else if (isCustom) {
            title.textContent = "Discuss Your Training Requirement";
            submit.textContent = "Request a Discussion";
            queryWrap.classList.remove("rhsa-hidden");
        } else {
            title.textContent = "Enquire Now";
            submit.textContent = "Submit Enquiry";
            queryWrap.classList.remove("rhsa-hidden");
        }

        courseField.value = course || "";
        courseLabel.textContent = course
            ? "Programme: " + course
            : (isCustom ? "Tell us about your organisation's training requirement." : "Tell us what you are looking for.");

        if (course) courseSelect.value = course;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("rhsa-modal-open");

        setTimeout(function () {
            const name = document.getElementById("rhsa-name");
            if (name) name.focus();
        }, 50);
    }

    function closeModal() {
        const modal = document.getElementById("rhsa-enquiry-modal");
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("rhsa-modal-open");
    }

    async function submitForm(e) {
        e.preventDefault();

        const form = e.currentTarget;
        const action = document.getElementById("rhsa-action").value;
        const status = document.getElementById("rhsa-status");
        const data = new FormData(form);

        data.set("course", document.getElementById("rhsa-course").value ||
                           document.getElementById("rhsa-course-select").value);

        if (action === "custom-training") {
            const designation = document.getElementById("rhsa-designation").value.trim();
            const organisation = document.getElementById("rhsa-custom-org").value.trim();
            const preferred = document.getElementById("rhsa-time").value;

            if (!designation || !organisation || !preferred) {
                status.classList.add("is-visible");
                status.textContent = "Please complete your designation, organisation and preferred time to connect.";
                return;
            }
        }

        status.classList.add("is-visible");
        status.textContent = "Please wait…";

        try {
            const response = await fetch("php/rhsa-enquiry.php", {
                method: "POST",
                body: data,
                headers: {"Accept": "application/json"}
            });

            const responseText = await response.text();

            let result;

            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error("RHSA SERVER RESPONSE:", responseText);
                throw new Error(
                    "Server returned an invalid response. HTTP " +
                    response.status +
                    ". Check the browser console for the actual server response."
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to submit your request.");
            }

            status.textContent = result.message;
            form.reset();

            if (action === "brochure" && result.brochure_url) {
                window.open(result.brochure_url, "_blank", "noopener");
            }
        } catch (error) {
            status.textContent = error.message || "Something went wrong. Please try again.";
        }
    }

    document.addEventListener("click", function (e) {
        const trigger = e.target.closest("[data-rhsa-action]");
        if (!trigger) return;
        e.preventDefault();

        const action = trigger.getAttribute("data-rhsa-action");
        const course = trigger.getAttribute("data-course") || "";
        openModal(action, course);
    });

    document.addEventListener("DOMContentLoaded", buildModal);
})();
