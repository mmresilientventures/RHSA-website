/*
 * RHSA Updates — Notion-powered Contact page section
 *
 * The database is managed in Notion. This script only renders the
 * published content returned by php/updates-api.php.
 */
(function () {
    "use strict";

    if (!document.querySelector(".contact-cta-section")) return;

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(value) {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(d);
    }

    function stripHtml(html) {
        const div = document.createElement("div");
        div.innerHTML = html || "";
        return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
    }

    function excerptFrom(content) {
        const text = stripHtml(content);
        if (text.length <= 260) return text;
        return text.slice(0, 257).trimEnd() + "…";
    }

    function injectStylesheet() {
        if (document.querySelector('link[data-rhsa-updates-css]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/rhsa-updates.css";
        link.dataset.rhsaUpdatesCss = "true";
        document.head.appendChild(link);
    }

    function ensureSection() {
        let section = document.getElementById("rhsa-updates");
        if (section) return section;

        section = document.createElement("section");
        section.id = "rhsa-updates";
        section.className = "rhsa-updates-section";
        section.innerHTML = `
            <div class="container">
                <div class="rhsa-updates-heading text-center">
                    <span class="rhsa-updates-eyebrow">WHAT'S HAPPENING AT RHSA</span>
                    <h2>RHSA Updates</h2>
                    <div class="rhsa-updates-divider"></div>
                </div>
                <div id="rhsa-updates-list" class="rhsa-updates-list"></div>
            </div>
        `;

        const cta = document.querySelector(".contact-cta-section");
        if (cta) cta.parentNode.insertBefore(section, cta);
        return section;
    }

    function ensureModal() {
        let modal = document.getElementById("rhsa-update-modal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "rhsa-update-modal";
        modal.className = "rhsa-update-modal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="rhsa-update-modal-backdrop" data-update-modal-close></div>
            <div class="rhsa-update-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rhsa-update-modal-title">
                <button type="button" class="rhsa-update-modal-close" aria-label="Close update" data-update-modal-close>&times;</button>
                <div class="rhsa-update-modal-inner">
                    <div class="rhsa-update-modal-category" id="rhsa-update-modal-category"></div>
                    <h2 id="rhsa-update-modal-title"></h2>
                    <div class="rhsa-update-modal-date" id="rhsa-update-modal-date"></div>
                    <div class="rhsa-update-modal-content" id="rhsa-update-modal-content"></div>
                    <div id="rhsa-update-modal-gallery" class="rhsa-update-modal-gallery"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function openModal(update) {
        const modal = ensureModal();
        modal.querySelector("#rhsa-update-modal-category").textContent = update.category || "RHSA Update";
        modal.querySelector("#rhsa-update-modal-title").textContent = update.title || "RHSA Update";
        modal.querySelector("#rhsa-update-modal-date").textContent = formatDate(update.date);
        modal.querySelector("#rhsa-update-modal-content").innerHTML = update.content || "<p>This update is currently unavailable.</p>";

        const gallery = modal.querySelector("#rhsa-update-modal-gallery");
        gallery.innerHTML = "";
        if (update.galleryLink && /^https?:\/\//i.test(update.galleryLink)) {
            const link = document.createElement("a");
            link.href = update.galleryLink;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "rhsa-update-gallery-link";
            link.textContent = "View Gallery →";
            gallery.appendChild(link);
        }

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("rhsa-update-modal-open");
        modal.querySelector(".rhsa-update-modal-close").focus();
    }

    function closeModal() {
        const modal = document.getElementById("rhsa-update-modal");
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("rhsa-update-modal-open");
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".rhsa-update-read-more[data-update-id]");
        if (button) {
            event.preventDefault();
            const update = window.RHSA_UPDATES && window.RHSA_UPDATES[button.dataset.updateId];
            if (update) openModal(update);
            return;
        }

        if (event.target.closest("[data-update-modal-close]")) closeModal();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
    });

    injectStylesheet();

    fetch("php/updates-api.php", {
        headers: { "Accept": "application/json" },
        cache: "no-store"
    })
        .then(response => {
            if (!response.ok) throw new Error("Unable to load RHSA Updates.");
            return response.json();
        })
        .then(data => {
            if (!data.success) throw new Error(data.error || "Unable to load RHSA Updates.");

            const updates = Array.isArray(data.updates) ? data.updates : [];
            updates.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            if (!updates.length) return;

            const section = ensureSection();
            const list = section.querySelector("#rhsa-updates-list");
            if (!list) return;

            window.RHSA_UPDATES = {};
            updates.forEach(update => {
                window.RHSA_UPDATES[update.id] = update;
            });

            list.innerHTML = updates.map(update => `
                <article class="rhsa-update-item">
                    <div class="rhsa-update-date">${escapeHtml(formatDate(update.date))}</div>
                    <div class="rhsa-update-body">
                        ${update.category ? `<div class="rhsa-update-category">${escapeHtml(update.category)}</div>` : ""}
                        <h3>${escapeHtml(update.title)}</h3>
                        ${excerptFrom(update.content) ? `<p>${escapeHtml(excerptFrom(update.content))}</p>` : ""}
                        <div class="rhsa-update-actions">
                            <button type="button" class="rhsa-update-read-more" data-update-id="${escapeHtml(update.id)}">Read Update <span aria-hidden="true">→</span></button>
                            ${update.galleryLink && /^https?:\/\//i.test(update.galleryLink) ? `<a class="rhsa-update-gallery" href="${escapeHtml(update.galleryLink)}" target="_blank" rel="noopener noreferrer">View Gallery <span aria-hidden="true">→</span></a>` : ""}
                        </div>
                    </div>
                </article>
            `).join("");
        })
        .catch(error => console.error("RHSA Updates:", error));
})();
