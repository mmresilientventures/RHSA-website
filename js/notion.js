/*
 * RHSA Insights — Notion renderer + RHSA article modal
 *
 * Notion remains the CMS. The browser talks only to php/notion-api.php.
 */
(function () {
    "use strict";

    const endpoint = "php/notion-api.php";
    const featuredSection = document.querySelector(".featured-insight");

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

    function injectStylesheet() {
        if (document.querySelector('link[data-rhsa-insights-css]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/insights-notion.css";
        link.dataset.rhsaInsightsCss = "true";
        document.head.appendChild(link);
    }

    function removeRetiredSections() {
        document.querySelectorAll(".insight-topics, .news-updates").forEach(section => section.remove());
        document.querySelectorAll(".articles-coming-soon, .news-updates-section").forEach(section => section.remove());
    }

    function ensureLatestSection() {
        let section = document.getElementById("rhsa-latest-insights");
        if (!section) {
            section = document.createElement("section");
            section.id = "rhsa-latest-insights";
            section.className = "rhsa-latest-insights section";
            const anchor = featuredSection || document.querySelector(".insights-intro");
            if (anchor) anchor.insertAdjacentElement("afterend", section);
        }
        return section;
    }

    function renderFeatured(article) {
        if (!featuredSection || !article) return;

        const image = featuredSection.querySelector(".featured-image img");
        if (image) {
            if (article.image) {
                image.src = article.image;
                image.alt = article.title || "Featured Insight";
                image.style.display = "block";
            } else {
                image.style.display = "none";
            }
        }

        const content = featuredSection.querySelector(".featured-content");
        if (!content) return;

        content.innerHTML = `
            ${article.category ? `<span class="featured-category">${escapeHtml(article.category)}</span>` : ""}
            <h3>${escapeHtml(article.title)}</h3>
            ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ""}
            ${article.date ? `<div class="notion-article-meta">${escapeHtml(formatDate(article.date))}</div>` : ""}
            <button type="button" class="notion-read-more" data-article-id="${escapeHtml(article.id)}">Read Insight <span aria-hidden="true">→</span></button>
        `;
    }

    function renderLatest(articles) {
        const section = ensureLatestSection();
        if (!section) return;

        if (!articles.length) {
            section.remove();
            return;
        }

        section.innerHTML = `
            <div class="container">
                <div class="section-title text-center">
                    <span class="section-subtitle">LATEST ARTICLES</span>
                    <h2>Latest Insights</h2>
                    <div class="section-divider"></div>
                </div>
                <div class="row">
                    ${articles.map(article => `
                        <div class="col-lg-4 col-md-6 mb-4">
                            <article class="notion-article-card">
                                ${article.image ? `<img class="notion-article-image" src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}">` : ""}
                                <div class="notion-article-content">
                                    ${article.category ? `<span class="notion-category">${escapeHtml(article.category)}</span>` : ""}
                                    <h3>${escapeHtml(article.title)}</h3>
                                    ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ""}
                                    ${article.date ? `<div class="notion-article-meta">${escapeHtml(formatDate(article.date))}</div>` : ""}
                                    <button type="button" class="notion-read-more" data-article-id="${escapeHtml(article.id)}">Read Insight <span aria-hidden="true">→</span></button>
                                </div>
                            </article>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    function ensureModal() {
        let modal = document.getElementById("rhsa-insight-modal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "rhsa-insight-modal";
        modal.className = "rhsa-insight-modal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="rhsa-modal-backdrop" data-modal-close></div>
            <div class="rhsa-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rhsa-modal-title">
                <button type="button" class="rhsa-modal-close" aria-label="Close insight" data-modal-close>&times;</button>
                <div class="rhsa-modal-inner">
                    <div class="rhsa-modal-category" id="rhsa-modal-category"></div>
                    <h2 id="rhsa-modal-title"></h2>
                    <div class="rhsa-modal-date" id="rhsa-modal-date"></div>
                    <div class="rhsa-modal-content" id="rhsa-modal-content"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function openModal(article) {
        const modal = ensureModal();
        modal.querySelector("#rhsa-modal-category").textContent = article.category || "RHSA Insights";
        modal.querySelector("#rhsa-modal-title").textContent = article.title || "RHSA Insight";
        modal.querySelector("#rhsa-modal-date").textContent = formatDate(article.date);
        modal.querySelector("#rhsa-modal-content").innerHTML = article.content || (article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : "<p>This insight is currently unavailable.</p>");
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("rhsa-modal-open");
        modal.querySelector(".rhsa-modal-close").focus();
    }

    function closeModal() {
        const modal = document.getElementById("rhsa-insight-modal");
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("rhsa-modal-open");
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".notion-read-more[data-article-id]");
        if (button) {
            event.preventDefault();
            const article = window.RHSA_INSIGHTS_ARTICLES && window.RHSA_INSIGHTS_ARTICLES[button.dataset.articleId];
            if (article) openModal(article);
            return;
        }
        if (event.target.closest("[data-modal-close]")) closeModal();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
    });

    injectStylesheet();
    removeRetiredSections();

    fetch(endpoint, { headers: { "Accept": "application/json" } })
        .then(response => {
            if (!response.ok) throw new Error("Unable to load Insights.");
            return response.json();
        })
        .then(data => {
            if (!data.success) throw new Error(data.error || "Unable to load Insights.");
            const articles = Array.isArray(data.articles) ? data.articles : [];

            // Keep the website strictly date-wise, newest first.
            articles.sort((a, b) => {
                const da = new Date(a.date || 0).getTime();
                const db = new Date(b.date || 0).getTime();
                return db - da;
            });

            window.RHSA_INSIGHTS_ARTICLES = {};
            articles.forEach(article => { window.RHSA_INSIGHTS_ARTICLES[article.id] = article; });

            if (!articles.length) {
                const latest = document.getElementById("rhsa-latest-insights");
                if (latest) latest.remove();
                const image = featuredSection && featuredSection.querySelector(".featured-image img");
                if (image) image.style.display = "none";
                return;
            }

            renderFeatured(articles[0]);
            renderLatest(articles.slice(1));
        })
        .catch(error => console.error("RHSA Insights:", error));
})();
