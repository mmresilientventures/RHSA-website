/*
 * RHSA Insights — Notion renderer
 *
 * The browser talks only to php/notion-api.php. The Notion integration
 * token therefore stays server-side and is never exposed to visitors.
 */
(function () {
    "use strict";

    const endpoint = "php/notion-api.php";

    const featuredEl = document.getElementById("notion-featured");
    const featuredStatus = document.getElementById("notion-featured-status");
    const articlesEl = document.getElementById("notion-articles");
    const articlesStatus = document.getElementById("notion-articles-status");

    if (!featuredEl && !articlesEl) return;

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeUrl(value) {
        try {
            const u = new URL(value, window.location.href);
            if (u.protocol === "http:" || u.protocol === "https:") return u.href;
        } catch (e) {}
        return "#";
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

    function placeholderImage() {
        return "images/insights-coming-soon.png";
    }

    function renderFeatured(article) {
        if (!featuredEl) return;
        const image = safeUrl(article.image || placeholderImage());
        const url = safeUrl(article.url);
        featuredEl.innerHTML = `
            <div class="col-lg-5 mb-4 mb-lg-0">
                <div class="notion-featured-card h-100">
                    <img class="notion-featured-image" src="${image}" alt="${escapeHtml(article.title)}">
                </div>
            </div>
            <div class="col-lg-7">
                <div class="notion-featured-content">
                    ${article.category ? `<span class="notion-category">${escapeHtml(article.category)}</span>` : ""}
                    <h3>${escapeHtml(article.title)}</h3>
                    ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ""}
                    ${article.date ? `<div class="notion-article-meta">${escapeHtml(formatDate(article.date))}</div>` : ""}
                    ${url !== "#" ? `<a class="notion-read-more" href="${url}" target="_blank" rel="noopener noreferrer">Read Insight →</a>` : ""}
                </div>
            </div>`;
    }

    function renderArticles(articles) {
        if (!articlesEl) return;
        articlesEl.innerHTML = articles.map(article => {
            const image = safeUrl(article.image || placeholderImage());
            const url = safeUrl(article.url);
            return `
                <div class="col-lg-4 col-md-6">
                    <article class="notion-article-card">
                        <img class="notion-article-image" src="${image}" alt="${escapeHtml(article.title)}">
                        <div class="notion-article-content">
                            ${article.category ? `<span class="notion-category">${escapeHtml(article.category)}</span>` : ""}
                            <h3>${escapeHtml(article.title)}</h3>
                            ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ""}
                            ${article.date ? `<div class="notion-article-meta">${escapeHtml(formatDate(article.date))}</div>` : ""}
                            ${url !== "#" ? `<a class="notion-read-more" href="${url}" target="_blank" rel="noopener noreferrer">Read Insight →</a>` : ""}
                        </div>
                    </article>
                </div>`;
        }).join("");
    }

    function showFallback(message) {
        if (featuredStatus) featuredStatus.textContent = message;
        if (articlesStatus) articlesStatus.textContent = "No published insights are available yet.";
        if (featuredEl) featuredEl.innerHTML = "";
        if (articlesEl) articlesEl.innerHTML = "";
    }

    fetch(endpoint, { headers: { "Accept": "application/json" } })
        .then(response => {
            if (!response.ok) throw new Error("Unable to load Insights.");
            return response.json();
        })
        .then(data => {
            if (!data.success) throw new Error(data.error || "Unable to load Insights.");
            const articles = Array.isArray(data.articles) ? data.articles : [];
            if (!articles.length) {
                showFallback("Insights are connected to Notion. Publish an article in the connected database to display it here.");
                return;
            }
            if (featuredStatus) featuredStatus.textContent = "";
            if (articlesStatus) articlesStatus.textContent = "";
            renderFeatured(articles[0]);
            renderArticles(articles);
        })
        .catch(error => {
            console.error("RHSA Insights:", error);
            showFallback("Insights could not be loaded right now.");
        });
})();
