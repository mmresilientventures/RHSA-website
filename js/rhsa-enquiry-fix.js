/*
 RHSA ENQUIRY CONTACT-RULE PATCH
 Load this AFTER js/rhsa-enquiry.js.
 It keeps the existing enquiry system intact and adds:
 - name required
 - phone OR email required
 - valid email when supplied
 - brochure requests require email
*/
(function () {
    "use strict";

    function applyFieldPresentation() {
        const phone = document.getElementById("rhsa-phone");
        const email = document.getElementById("rhsa-email");
        if (phone) {
            phone.removeAttribute("required");
            const label = document.querySelector('label[for="rhsa-phone"]');
            if (label) label.textContent = "Contact Number";
        }
        if (email) {
            email.removeAttribute("required");
            const label = document.querySelector('label[for="rhsa-email"]');
            if (label) label.textContent = "Email ID";
        }
    }

    function validate(event) {
        const form = event.target;
        if (!form || form.id !== "rhsa-enquiry-form") return;

        const name = document.getElementById("rhsa-name");
        const phone = document.getElementById("rhsa-phone");
        const email = document.getElementById("rhsa-email");
        const action = document.getElementById("rhsa-action");
        const status = document.getElementById("rhsa-status");

        if (!name || !phone || !email || !status) return;

        applyFieldPresentation();

        const n = name.value.trim();
        const p = phone.value.trim();
        const e = email.value.trim();

        let message = "";

        if (!n) {
            message = "Please enter your name.";
        } else if (!p && !e) {
            message = "Please enter either your mobile number or email address.";
        } else if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
            message = "Please enter a valid email address.";
        } else if (action && action.value === "brochure" && !e) {
            message = "Please enter your email address so we can send you the brochure.";
        }

        if (message) {
            event.preventDefault();
            event.stopImmediatePropagation();
            status.classList.add("is-visible");
            status.textContent = message;
        }
    }

    document.addEventListener("submit", validate, true);

    const observer = new MutationObserver(applyFieldPresentation);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("DOMContentLoaded", applyFieldPresentation);
    setTimeout(applyFieldPresentation, 100);
    setTimeout(applyFieldPresentation, 500);
})();
