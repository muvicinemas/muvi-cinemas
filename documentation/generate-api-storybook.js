/**
 * generate-api-storybook.js
 *
 * Generates a beautiful, scrolling "storybook" HTML page that explains
 * the entire Muvi Cinemas platform — CMS first, then Website — as a
 * narrative walkthrough for a new developer on their first day.
 *
 * Covers ALL ~272 API endpoints across CMS (~130) and Website (~142).
 *
 * Usage:  node documentation/generate-api-storybook.js
 * Output: documentation/api-storybook.html
 */

const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "api-storybook.html");
const BASE = "http://localhost:3000/api/v1";

/* ── tiny helpers ───────────────────────────────────────────────────── */
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function badge(method) {
  var c = { GET:"emerald", POST:"sky", PUT:"amber", PATCH:"violet", DELETE:"rose" }[method] || "slate";
  return '<span class="method-badge method-' + c + '">' + method + "</span>";
}
function jsonBlock(obj) {
  if (!obj) return "";
  return '<pre class="json-block">' + esc(typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)) + "</pre>";
}

/* ── Chapter & step builders ────────────────────────────────────────── */
var stepCounter = 0;

function chapter(num, icon, title, subtitle) {
  return '<section class="chapter" id="ch-' + num + '">'
    + '<div class="chapter-marker"><span class="chapter-num">Chapter ' + num + "</span></div>"
    + '<h2 class="chapter-title"><span class="chapter-icon">' + icon + "</span> " + esc(title) + "</h2>"
    + '<p class="chapter-subtitle">' + subtitle + "</p>"
    + "</section>";
}

function narrativeBlock(html) {
  return '<div class="narrative">' + html + "</div>";
}

function apiStep(o) {
  stepCounter++;
  var id = "step-" + stepCounter;
  var headersHtml = "";
  if (o.headers && o.headers.length) {
    headersHtml = '<div class="step-headers"><div class="step-label">Headers</div><table class="hdr-table">';
    for (var i = 0; i < o.headers.length; i++) {
      headersHtml += "<tr><td>" + esc(o.headers[i].name) + "</td><td>" + esc(o.headers[i].value) + "</td></tr>";
    }
    headersHtml += "</table></div>";
  }
  var payloadHtml = o.payload ? '<div class="step-payload"><div class="step-label">Request Payload</div>' + jsonBlock(o.payload) + "</div>" : "";
  var responseHtml = o.response ? '<div class="step-response"><div class="step-label">Response</div>' + jsonBlock(o.response) + "</div>" : "";
  var whenHtml = o.when ? '<div class="step-when">' + o.when + "</div>" : "";

  return '<div class="api-step" id="' + id + '">'
    + '<div class="step-connector"></div>'
    + '<div class="step-dot"></div>'
    + '<div class="step-content">'
    + '<div class="step-title">' + badge(o.method) + " <code>" + esc(o.url) + "</code></div>"
    + whenHtml
    + '<div class="step-desc">' + o.description + "</div>"
    + headersHtml
    + payloadHtml
    + responseHtml
    + "</div></div>";
}

function flowDiagram(steps) {
  var html = '<div class="flow-diagram">';
  for (var i = 0; i < steps.length; i++) {
    if (i > 0) html += '<div class="flow-arrow">&rarr;</div>';
    html += '<div class="flow-box' + (steps[i].highlight ? " flow-highlight" : "") + '">' + steps[i].label + "</div>";
  }
  html += "</div>";
  return html;
}

function tipBox(text) {
  return '<div class="tip-box"><span class="tip-icon">&#128161;</span> ' + text + "</div>";
}

function warningBox(text) {
  return '<div class="warning-box"><span class="tip-icon">&#9888;&#65039;</span> ' + text + "</div>";
}

function sectionDivider() {
  return '<div class="section-divider"><div class="divider-line"></div><div class="divider-dot"></div><div class="divider-line"></div></div>';
}

function subHeading(text) {
  return '<h3 class="sub-heading">' + text + '</h3>';
}

/* ════════════════════════════════════════════════════════════════════
   STORY CONTENT
   ════════════════════════════════════════════════════════════════════ */

function buildStory() {
  var parts = [];

  // ────────────────────────────────────────────────────────────────────
  // HERO
  // ────────────────────────────────────────────────────────────────────
  parts.push('<div class="hero">');
  parts.push('<div class="hero-badge">The Complete API Storybook</div>');
  parts.push('<h1 class="hero-title">Muvi Cinemas</h1>');
  parts.push('<p class="hero-subtitle">A first-day walkthrough for new developers.<br/>From login to booking, every API call explained like a story.</p>');
  parts.push('<div class="hero-meta">');
  parts.push('<div class="hero-chip">CMS &mdash; ~130 endpoints</div>');
  parts.push('<div class="hero-chip">Website &mdash; ~142 endpoints</div>');
  parts.push('<div class="hero-chip">Every single one documented</div>');
  parts.push("</div>");
  parts.push("</div>");

  // ────────────────────────────────────────────────────────────────────
  // OBSERVATIONS / COVERAGE STATS
  // ────────────────────────────────────────────────────────────────────
  parts.push('<div class="obs-card">');
  parts.push('<div class="obs-title">&#128202; Coverage Observations</div>');
  parts.push('<table class="obs-table">');
  parts.push('<thead><tr><th>Source</th><th>Endpoints</th><th>Covered</th></tr></thead>');
  parts.push('<tbody>');
  parts.push('<tr><td>CMS <span class="obs-dim">(logic/services/ &mdash; 36 dirs)</span></td><td>~130</td><td>~151 steps (Ch 1&ndash;12)</td></tr>');
  parts.push('<tr><td>Website <span class="obs-dim">(logic/services/ &mdash; 27 dirs)</span></td><td>112</td><td>~133 steps (Ch 13&ndash;24)</td></tr>');
  parts.push('<tr><td>Website <span class="obs-dim">(features/ &mdash; wallet, cashback, stc-pay, login-and-signup)</span></td><td>30</td><td>included above</td></tr>');
  parts.push('<tr class="obs-total"><td>Total</td><td>~272</td><td>284 steps</td></tr>');
  parts.push('</tbody></table>');
  parts.push('<p class="obs-note">The step count is slightly higher than 272 because a few endpoints appear in different contexts (e.g., <code>orders/:id</code> is used in both <em>Booking</em> and <em>My Bookings</em>, and infinite-query variants are documented as separate steps).</p>');
  parts.push('</div>');

  // ────────────────────────────────────────────────────────────────────
  // TABLE OF CONTENTS
  // ────────────────────────────────────────────────────────────────────
  parts.push('<nav class="toc">');
  parts.push('<div class="toc-title">Table of Contents</div>');
  parts.push('<div class="toc-section">Part I &mdash; CMS (Admin Panel) &mdash; ~130 Endpoints</div>');
  parts.push('<a href="#ch-1" class="toc-link">Chapter 1 &mdash; Authentication &amp; Profile (7 endpoints)</a>');
  parts.push('<a href="#ch-2" class="toc-link">Chapter 2 &mdash; Dashboard, Settings &amp; Global Config (4 endpoints)</a>');
  parts.push('<a href="#ch-3" class="toc-link">Chapter 3 &mdash; Movies, Genres, Ratings &amp; Casting (28 endpoints)</a>');
  parts.push('<a href="#ch-4" class="toc-link">Chapter 4 &mdash; Cinemas, Cities &amp; Experiences (22 endpoints)</a>');
  parts.push('<a href="#ch-5" class="toc-link">Chapter 5 &mdash; Showtimes &amp; Sessions (2 endpoints)</a>');
  parts.push('<a href="#ch-6" class="toc-link">Chapter 6 &mdash; Banners, Offers &amp; Offer Rules (16 endpoints)</a>');
  parts.push('<a href="#ch-7" class="toc-link">Chapter 7 &mdash; Users, Roles &amp; Permissions (10 endpoints)</a>');
  parts.push('<a href="#ch-8" class="toc-link">Chapter 8 &mdash; Customers, Orders &amp; Refunds (10 endpoints)</a>');
  parts.push('<a href="#ch-9" class="toc-link">Chapter 9 &mdash; Food &amp; Beverages, Bank Accounts (9 endpoints)</a>');
  parts.push('<a href="#ch-10" class="toc-link">Chapter 10 &mdash; Notifications &amp; Push Templates (8 endpoints)</a>');
  parts.push('<a href="#ch-11" class="toc-link">Chapter 11 &mdash; SEO, Dynamic Pages, Onboarding (12 endpoints)</a>');
  parts.push('<a href="#ch-12" class="toc-link">Chapter 12 &mdash; Logs, Files, Kiosks &amp; Misc (14 endpoints)</a>');
  parts.push('<div class="toc-section">Part II &mdash; Website (Customer) &mdash; ~142 Endpoints</div>');
  parts.push('<a href="#ch-13" class="toc-link">Chapter 13 &mdash; Website Boots: Settings, Cities, Banners (6 endpoints)</a>');
  parts.push('<a href="#ch-14" class="toc-link">Chapter 14 &mdash; Sign Up, Login &amp; OTP (22 endpoints)</a>');
  parts.push('<a href="#ch-15" class="toc-link">Chapter 15 &mdash; Browsing Movies (12 endpoints)</a>');
  parts.push('<a href="#ch-16" class="toc-link">Chapter 16 &mdash; Movie Finder &amp; Search (11 endpoints)</a>');
  parts.push('<a href="#ch-17" class="toc-link">Chapter 17 &mdash; Cinemas &amp; Experiences (6 endpoints)</a>');
  parts.push('<a href="#ch-18" class="toc-link">Chapter 18 &mdash; Booking a Ticket (14 endpoints)</a>');
  parts.push('<a href="#ch-19" class="toc-link">Chapter 19 &mdash; Payment &amp; Credit Cards (12 endpoints)</a>');
  parts.push('<a href="#ch-20" class="toc-link">Chapter 20 &mdash; My Bookings &amp; Cancellations (10 endpoints)</a>');
  parts.push('<a href="#ch-21" class="toc-link">Chapter 21 &mdash; Wallet &amp; Top-ups (8 endpoints)</a>');
  parts.push('<a href="#ch-22" class="toc-link">Chapter 22 &mdash; Cashback (4 endpoints)</a>');
  parts.push('<a href="#ch-23" class="toc-link">Chapter 23 &mdash; Offers &amp; Vouchers (10 endpoints)</a>');
  parts.push('<a href="#ch-24" class="toc-link">Chapter 24 &mdash; Profile, Notifications &amp; Everything Else (27 endpoints)</a>');
  parts.push("</nav>");

  // ════════════════════════════════════════════════════════════════════
  //  PART I — CMS
  // ════════════════════════════════════════════════════════════════════
  parts.push('<div class="part-header"><span class="part-label">Part I</span><span class="part-title">CMS &mdash; The Admin Panel</span></div>');

  parts.push(narrativeBlock(
    "<p>Welcome to your first day at Muvi Cinemas! &#127909;</p>"
    + "<p>Your team lead sits down with you and says: <em>&ldquo;Let me walk you through everything. We&rsquo;ll start with the CMS &mdash; that&rsquo;s the admin panel where our ops team manages movies, cinemas, offers, and everything else. Then we&rsquo;ll go through the customer-facing website.&rdquo;</em></p>"
    + "<p>The CMS is a <strong>React + Vite</strong> SPA. It uses <strong>Zustand</strong> for auth state, <strong>React Query</strong> with <strong>Axios</strong> for API calls, and <strong>@nestjsx/crud-request</strong> for query building. Base URL: <code>" + BASE + "</code>.</p>"
  ));

  // ── CH 1 — CMS Auth ──────────────────────────────────────────────
  parts.push(chapter(1, "&#128274;", "Authentication & Profile", "Login, password reset, token verification &mdash; 7 endpoints."));

  parts.push(flowDiagram([
    { label: "User opens CMS" },
    { label: "Login page renders" },
    { label: "Enters email + password", highlight: true },
    { label: "POST cms/auth/login" },
    { label: "Store token + permissions" },
    { label: "Redirect to /app" },
  ]));

  // 1
  parts.push(apiStep({ method: "POST", url: "cms/auth/login", when: "Admin clicks &ldquo;Sign In&rdquo;", description: "Authenticates the CMS user. Returns JWT token, refresh token, the user object, and the full list of permissions. The CMS stores the token in <code>localStorage</code> via zustand and sets it as a default Axios header.", headers: [{ name: "Content-Type", value: "application/json" }, { name: "x-device-platform", value: "web" }], payload: { email: "admin@muvicinemas.com", password: "Str0ngP@ssword!" }, response: { user: { id: "01HZYX...", email: "admin@muvicinemas.com", firstName: "Muvi", lastName: "Admin", role: { id: 1, name: "Super Admin" } }, token: "eyJhbGciOiJSUzI1NiIs...", refreshToken: "eyJhbGciOiJSUzI1NiIs...", permissions: [{ id: 1, resource: "CMS_USER", action: "READ" }, { id: 2, resource: "FILMS", action: "UPDATE" }] } }));
  // 2
  parts.push(apiStep({ method: "GET", url: "cms/auth/me", when: "On every app mount / page refresh", description: "Fetches the current logged-in admin&rsquo;s profile and permissions. Used to determine sidebar visibility, route access, and display user info.", headers: [{ name: "Authorization", value: "Bearer eyJhbG..." }], response: { id: "01HZYX...", email: "admin@muvicinemas.com", firstName: "Muvi", lastName: "Admin", role: { id: 1, name: "Super Admin" }, permissions: ["CMS_USER:READ", "FILMS:READ", "FILMS:UPDATE"] } }));
  // 3
  parts.push(apiStep({ method: "POST", url: "cms/auth/forget-password", when: "Admin clicks &ldquo;Forgot Password?&rdquo;", description: "Sends a password reset email to the given email address. Email contains a one-time token link.", payload: { email: "admin@muvicinemas.com" }, response: { message: "Reset email sent" } }));
  // 4
  parts.push(apiStep({ method: "POST", url: "cms/auth/check-token", when: "Admin opens the reset link from email", description: "Verifies the reset token from the email URL is still valid and not expired.", payload: { token: "reset_token_from_email" }, response: { valid: true } }));
  // 5
  parts.push(apiStep({ method: "PATCH", url: "cms/auth/reset-password", when: "Admin submits a new password", description: "Sets a new password using the verified reset token.", headers: [{ name: "Authorization", value: "Bearer <reset-token>" }], payload: { password: "NewStr0ngP@ssword!" }, response: { message: "Password updated" } }));
  // 6
  parts.push(apiStep({ method: "PATCH", url: "cms/auth/change-password", when: "Admin changes password from profile", description: "Changes the current admin&rsquo;s password. Requires the old password for verification.", payload: { oldPassword: "current", newPassword: "newOne!" }, response: { message: "Password changed" } }));
  // 7
  parts.push(apiStep({ method: "PUT", url: "cms/auth/profile", when: "Admin updates their profile", description: "Updates the admin&rsquo;s own profile info: name, email, avatar.", payload: { firstName: "Muvi", lastName: "Admin", email: "admin@muvicinemas.com" } }));

  parts.push(tipBox("After login, the token is attached to every subsequent request via an Axios interceptor: <code>Authorization: Bearer eyJhbG...</code>"));
  parts.push(sectionDivider());

  // ── CH 2 — Dashboard / Settings ──────────────────────────────────
  parts.push(chapter(2, "&#128200;", "Dashboard, Settings & Global Config", "What loads when the admin lands on /app &mdash; 4 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;After login, the app redirects to <code>/app</code>. The first thing it does is check: who am I? What can I see? It also loads global settings.&rdquo;</p>"));

  // 8
  parts.push(apiStep({ method: "GET", url: "cms/settings", when: "Dashboard layout mounts", description: "Loads global platform settings: checkout timeouts, maintenance mode flags, app version requirements. Used across the CMS for form defaults.", response: { checkoutExtendedTimeIn3ds: 120, countMinutesAfterFinishFilm: 30, countMinutesSinceStartFilm: 15, maintenanceMode: false } }));
  // 9
  parts.push(apiStep({ method: "PATCH", url: "cms/settings", when: "Admin updates global settings", description: "Updates global platform settings. Only Super Admins have access to this.", payload: { maintenanceMode: false, checkoutExtendedTimeIn3ds: 120 } }));
  // 10
  parts.push(apiStep({ method: "GET", url: "cms/transactions", when: "Transactions page loads", description: "Lists all financial transactions: ticket purchases, refunds, wallet top-ups. Paginated with date range filters.", response: { data: [{ id: "01T...", type: "PURCHASE", amount: 150, currency: "SAR", date: "2026-01-15T14:22:00Z" }], count: 2450 } }));
  // 11
  parts.push(apiStep({ method: "GET", url: "cms/cards/mada-card-bins", when: "Mada BIN management page loads", description: "Fetches the list of all Mada card BIN numbers. Mada is the Saudi debit card network and requires special processing.", response: [{ bin: "588845" }, { bin: "440795" }] }));
  parts.push(apiStep({ method: "PUT", url: "cms/cards/mada-card-bins", when: "Admin updates Mada BINs", description: "Updates the full Mada BIN list. When new BINs are issued by SAMA (Saudi Central Bank), they&rsquo;re added here.", payload: { bins: ["588845", "440795", "446404"] } }));

  parts.push(sectionDivider());

  // ── CH 3 — Movies, Genres, Ratings, Casting ──────────────────────
  parts.push(chapter(3, "&#127910;", "Movies, Genres, Ratings & Casting", "The content engine &mdash; films, people, categories &mdash; 28 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Muvi uses <strong>Vista</strong> as the cinema management backend. Movies, cinemas, and showtimes originate from Vista and are synced into our system. Let me show you...&rdquo;</p>"));

  parts.push(flowDiagram([
    { label: "Vista System" },
    { label: "POST cms/films/sync", highlight: true },
    { label: "Muvi DB" },
    { label: "GET cms/films" },
    { label: "Movies List Page" },
  ]));

  parts.push(subHeading("Movies (11 endpoints)"));

  // 12
  parts.push(apiStep({ method: "GET", url: "cms/films", when: "Movies list page loads", description: "Fetches the paginated list of all movies. Uses <code>@nestjsx/crud-request</code> query builder for pagination, sorting, and filters. The table shows title, rating, publish status, and actions.", response: { data: [{ id: "01ABC...", title: "Mission Impossible 8", rating: { name: "PG-13" }, isPublished: true }], count: 42, total: 42, page: 1, pageCount: 3 } }));
  // 13
  parts.push(apiStep({ method: "GET", url: "cms/films/:id", when: "Admin clicks Edit on a movie", description: "Loads full movie detail for the edit form. Includes title (EN/AR), description, trailer, poster, genres, cast, duration, etc.", response: { id: "01ABC...", title: { en: "Mission Impossible 8", ar: "المهمة المستحيلة 8" }, trailer: "https://youtube.com/watch?v=...", poster: "https://cdn.../mi8.jpg", genres: [{ id: 1, name: "Action" }], people: [{ id: 1, name: "Tom Cruise", type: "ACTOR" }], rating: { id: 1, name: "PG-13" }, duration: 165, isPublished: true } }));
  // 14
  parts.push(apiStep({ method: "PUT", url: "cms/films/:id", when: "Admin saves movie changes", description: "Updates the movie with new data: Arabic translations, poster, genres, etc.", payload: { title: { en: "Mission Impossible 8", ar: "المهمة المستحيلة ٨" }, isPublished: true } }));
  // 15
  parts.push(apiStep({ method: "POST", url: "cms/films/sync", when: "Admin clicks Sync Movies", description: "Triggers synchronization of all films from the Vista system into Muvi database. New movies created, existing ones updated.", response: { message: "Sync started", count: 42 } }));
  // 16
  parts.push(apiStep({ method: "PATCH", url: "cms/films/:movieId/:customUrl", when: "Admin toggles Publish switch", description: "Publishes or unpublishes a movie. <code>:customUrl</code> = <code>publish</code> or <code>unpublish</code>.", response: { isPublished: true } }));
  // 17
  parts.push(apiStep({ method: "GET", url: "cms/bookmarks", when: "Movie form loads (bookmark dropdown)", description: "Fetches all bookmark categories. Movies are categorized under &ldquo;Now Showing&rdquo;, &ldquo;Coming Soon&rdquo;, &ldquo;Advance Booking&rdquo;.", response: [{ id: 1, name: "Now Showing" }, { id: 2, name: "Coming Soon" }, { id: 3, name: "Advance Booking" }] }));
  // 18
  parts.push(apiStep({ method: "PATCH", url: "cms/films/:movieId/meta-data", when: "Admin edits movie SEO", description: "Updates SEO metadata for a specific movie: meta title, meta description, OG image for search engine optimization." }));
  // 19
  parts.push(apiStep({ method: "PATCH", url: "cms/films/:movieId/force-on-top", when: "Admin forces movie to top", description: "Pins a movie to the top of the listing, overriding the default sort order." }));
  // 20
  parts.push(apiStep({ method: "PATCH", url: "cms/films/:movieId/remove-force-on-top", when: "Admin removes force-on-top", description: "Removes the pinned status, returning the movie to its natural sort position." }));
  // 21
  parts.push(apiStep({ method: "GET", url: "cms/films/watched", when: "Notification targeting (watched movies filter)", description: "Lists movies that have been watched by users. Used when creating push notifications targeted at people who watched a specific movie." }));
  // 22
  parts.push(apiStep({ method: "GET", url: "cms/orders/most-visited", when: "Notification targeting (most visited cinemas)", description: "Returns cinemas sorted by visit count. Used when creating push notifications targeted at frequent visitors of specific cinemas." }));

  parts.push(subHeading("Genres (6 endpoints)"));
  // 23
  parts.push(apiStep({ method: "GET", url: "cms/genres", when: "Genres list page loads", description: "All movie genres: Action, Comedy, Drama, etc. Each can be published/unpublished.", response: { data: [{ id: 1, name: "Action", isPublished: true }, { id: 2, name: "Drama", isPublished: true }] } }));
  // 24
  parts.push(apiStep({ method: "GET", url: "cms/genres/:id", when: "Admin edits a genre", description: "Single genre detail for the edit form." }));
  // 25
  parts.push(apiStep({ method: "POST", url: "cms/genres", when: "Admin creates a genre", description: "Creates a new genre with name (EN/AR).", payload: { name: { en: "Thriller", ar: "إثارة" } } }));
  // 26
  parts.push(apiStep({ method: "PUT", url: "cms/genres/:id", when: "Admin updates a genre", description: "Updates genre name or translations." }));
  // 27
  parts.push(apiStep({ method: "POST", url: "cms/genres/sync", when: "Admin syncs genres from Vista", description: "Syncs genre list from Vista into Muvi." }));
  // 28
  parts.push(apiStep({ method: "PATCH", url: "cms/genres/:genreId/:customUrl", when: "Admin publishes/unpublishes a genre", description: "Toggles the publish status of a genre." }));

  parts.push(subHeading("Ratings (3 endpoints)"));
  // 29
  parts.push(apiStep({ method: "GET", url: "cms/rates", when: "Ratings list page loads", description: "All content ratings: G, PG, PG-13, R, etc. with their descriptions.", response: { data: [{ id: 1, name: "G", description: "General Audience" }, { id: 2, name: "PG-13" }] } }));
  // 30
  parts.push(apiStep({ method: "GET", url: "cms/rates/:id", when: "Admin edits a rating", description: "Single rating detail." }));
  // 31
  parts.push(apiStep({ method: "PUT", url: "cms/rates/:id", when: "Admin updates a rating", description: "Updates rating name, description, or icon." }));

  parts.push(subHeading("Casting / People (6 endpoints)"));
  // 32
  parts.push(apiStep({ method: "GET", url: "cms/people", when: "Casting list page loads", description: "All actors, directors, writers, etc. Used when assigning cast to movies.", response: { data: [{ id: 1, name: "Tom Cruise", type: "ACTOR", photo: "https://cdn.../tc.jpg" }] } }));
  // 33
  parts.push(apiStep({ method: "GET", url: "cms/people/:id", when: "Admin edits a cast member", description: "Full cast member detail." }));
  // 34
  parts.push(apiStep({ method: "POST", url: "cms/people", when: "Admin creates a cast member", description: "Creates a new person entry.", payload: { name: "Tom Cruise", type: "ACTOR", photo: "https://cdn.../tc.jpg" } }));
  // 35
  parts.push(apiStep({ method: "PUT", url: "cms/people/:id", when: "Admin updates a cast member", description: "Updates person details." }));
  // 36
  parts.push(apiStep({ method: "POST", url: "cms/people/sync", when: "Admin syncs cast from Vista", description: "Syncs people/cast data from Vista." }));
  // 37
  parts.push(apiStep({ method: "PATCH", url: "cms/people/:castId/:customUrl", when: "Admin publishes/unpublishes a cast member", description: "Toggles publish status." }));

  parts.push(subHeading("Specialties (4 endpoints)"));
  // 38
  parts.push(apiStep({ method: "GET", url: "cms/specialties", when: "Specialties list loads", description: "Movie specialties/features like &ldquo;Subtitled&rdquo;, &ldquo;Dubbed&rdquo;, &ldquo;Original Language&rdquo;.", response: { data: [{ id: 1, name: "Subtitled" }, { id: 2, name: "Dubbed" }] } }));
  // 39
  parts.push(apiStep({ method: "GET", url: "cms/specialties/:id", when: "Admin edits a specialty", description: "Single specialty detail." }));
  // 40
  parts.push(apiStep({ method: "POST", url: "cms/specialties", when: "Admin creates a specialty", description: "Creates a new specialty.", payload: { name: { en: "ATMOS Sound", ar: "..." } } }));
  // 41
  parts.push(apiStep({ method: "PUT", url: "cms/specialties/:id", when: "Admin updates a specialty", description: "Updates specialty details." }));

  parts.push(sectionDivider());

  // ── CH 4 — Cinemas, Cities, Experiences ──────────────────────────
  parts.push(chapter(4, "&#127983;", "Cinemas, Cities & Experiences", "Locations, city management, and cinema experiences &mdash; 22 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Cinemas are organized by city. An admin manages cities, then within each city, manages cinemas and their ordering. Experiences (IMAX, VIP, 4DX) are managed separately.&rdquo;</p>"));

  parts.push(subHeading("Cinemas (8 endpoints)"));
  // 42
  parts.push(apiStep({ method: "GET", url: "cms/cinemas", when: "Cinemas list page loads", description: "All cinemas with city, address, screens, experiences, publish status. Paginated.", response: { data: [{ id: "01C...", name: { en: "Muvi Mall of Arabia", ar: "..." }, city: { name: "Jeddah" }, screens: 12, isPublished: true }], count: 28 } }));
  // 43
  parts.push(apiStep({ method: "GET", url: "cms/cinemas/:id", when: "Admin edits a cinema", description: "Full cinema detail: name (EN/AR), description, address, lat/lng, images, experiences, SEO metadata." }));
  // 44
  parts.push(apiStep({ method: "PUT", url: "cms/cinemas/:id", when: "Admin saves cinema changes", description: "Updates cinema details, images, descriptions." }));
  // 45
  parts.push(apiStep({ method: "POST", url: "cms/cinemas/sync", when: "Admin syncs cinemas from Vista", description: "Syncs all cinema locations from Vista. Creates new cinemas, updates existing ones.", response: { message: "Cinemas synced", count: 28 } }));
  // 46
  parts.push(apiStep({ method: "PATCH", url: "cms/cinemas/:cinemaId/:customUrl", when: "Admin publishes/unpublishes a cinema", description: "Toggles the publish status." }));
  // 47
  parts.push(apiStep({ method: "PATCH", url: "cms/cinemas/:cinemaId/meta-data", when: "Admin edits cinema SEO", description: "Updates SEO metadata for a cinema page." }));
  // 48
  parts.push(apiStep({ method: "PATCH", url: "cms/cinemas/:cinemaId/kiosk-data", when: "Admin configures kiosk settings for a cinema", description: "Updates kiosk-specific configuration for a cinema (which kiosk hardware is assigned, display settings)." }));
  // 49
  parts.push(apiStep({ method: "GET", url: "cms/collectors", when: "Cinema form loads", description: "Fetches Vista collector IDs used to map cinemas to Vista&rsquo;s own cinema identifiers." }));

  parts.push(subHeading("Cities (4 endpoints)"));
  // 50
  parts.push(apiStep({ method: "GET", url: "cms/cities", when: "Cities list page loads", description: "All operating cities. Each has names in EN/AR and a count of cinemas.", response: { data: [{ id: "01X...", name: { en: "Riyadh", ar: "الرياض" }, isPublished: true, cinemasCount: 8 }], count: 12 } }));
  // 51
  parts.push(apiStep({ method: "GET", url: "cms/cities/:id", when: "Admin edits a city", description: "Single city detail." }));
  // 52
  parts.push(apiStep({ method: "POST", url: "cms/cities", when: "Admin creates a city", description: "Creates a new city.", payload: { name: { en: "Dammam", ar: "الدمام" } } }));
  // 53
  parts.push(apiStep({ method: "PUT", url: "cms/cities/:id", when: "Admin updates a city", description: "Updates city name or translations." }));

  parts.push(subHeading("City-Cinema Ordering (2 endpoints)"));
  // 54
  parts.push(apiStep({ method: "GET", url: "cms/cities/:cityId/cinemas", when: "Reorder cinemas in a city", description: "Lists cinemas in a specific city for drag-and-drop reordering. The order determines how cinemas appear on the website." }));
  // 55
  parts.push(apiStep({ method: "PATCH", url: "cms/cities/:cityId/cinemas/:cinemaId", when: "Admin saves cinema reorder", description: "Updates the display order of a cinema within its city." }));

  parts.push(subHeading("City-Movie Ordering (2 endpoints)"));
  // 56
  parts.push(apiStep({ method: "GET", url: "cms/cities/:cityId/films", when: "Reorder movies in a city", description: "Lists movies available in a specific city for reordering." }));
  // 57
  parts.push(apiStep({ method: "PUT", url: "cms/cities/:cityId/films/:filmId", when: "Admin saves movie reorder", description: "Updates display order of a movie within a city." }));

  parts.push(subHeading("Experiences (6 endpoints)"));
  // 58
  parts.push(apiStep({ method: "GET", url: "cms/experiences", when: "Experiences list loads", description: "All cinema experiences: Standard, IMAX, VIP, 4DX, ScreenX, etc.", response: { data: [{ id: 1, name: "IMAX" }, { id: 2, name: "VIP" }, { id: 3, name: "4DX" }] } }));
  // 59
  parts.push(apiStep({ method: "GET", url: "cms/experiences/:id", when: "Admin edits an experience", description: "Single experience detail." }));
  // 60
  parts.push(apiStep({ method: "POST", url: "cms/experiences", when: "Admin creates an experience", description: "Creates a new experience type.", payload: { name: { en: "MX4D", ar: "..." }, icon: "https://cdn.../mx4d.png" } }));
  // 61
  parts.push(apiStep({ method: "PUT", url: "cms/experiences/:id", when: "Admin updates an experience", description: "Updates experience details." }));
  // 62
  parts.push(apiStep({ method: "GET", url: "cms/experiences/cinema-filters", when: "Experience filter by cinema", description: "Returns experiences grouped by cinema. Used in filter dropdowns." }));
  // 63
  parts.push(apiStep({ method: "PATCH", url: "cms/experiences/:experienceId/meta-data", when: "Admin edits experience SEO", description: "Updates SEO metadata for an experience page." }));
  // 64 (bonus from experienceId publish)
  parts.push(apiStep({ method: "PATCH", url: "cms/experiences/:experienceId/:customUrl", when: "Admin publishes/unpublishes an experience", description: "Toggles the publish status of an experience." }));

  parts.push(sectionDivider());

  // ── CH 5 — Showtimes ──────────────────────────────────────────────
  parts.push(chapter(5, "&#128197;", "Showtimes & Sessions", "How movie sessions are synced and displayed &mdash; 2 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Showtimes (sessions) are synced from Vista. Each showtime links a movie to a cinema screen at a specific date and time.&rdquo;</p>"));

  // 65
  parts.push(apiStep({ method: "GET", url: "cms/sessions", when: "Showtimes list page loads", description: "Paginated list of all sessions. Filters: by movie, cinema, date range, experience. Shows movie title, cinema, screen, time, available seats.", response: { data: [{ id: "01S...", film: { title: "MI8" }, cinema: { name: "Mall of Arabia" }, screenName: "Screen 3", startTime: "2026-01-15T19:30:00Z", experience: "IMAX", seatsAvailable: 142 }] } }));
  // 66
  parts.push(apiStep({ method: "POST", url: "cms/sessions/sync", when: "Admin clicks Sync Showtimes", description: "Fetches latest showtime schedule from Vista. Runs automatically on schedule but can be triggered manually." }));

  parts.push(sectionDivider());

  // ── CH 6 — Banners, Offers, Offer Rules ──────────────────────────
  parts.push(chapter(6, "&#127873;", "Banners, Offers & Offer Rules", "Promotional content management &mdash; 16 endpoints."));

  parts.push(subHeading("Home Banners (5 endpoints)"));
  // 67
  parts.push(apiStep({ method: "GET", url: "cms/banners", when: "Banners list page loads", description: "All homepage banners. Each has desktop + mobile images, link, and display order.", response: { data: [{ id: 1, title: "Summer Special", image: "https://cdn.../b1.jpg", order: 1, isPublished: true }] } }));
  // 68
  parts.push(apiStep({ method: "GET", url: "cms/banners/:id", when: "Admin edits a banner", description: "Single banner detail for the edit form." }));
  // 69
  parts.push(apiStep({ method: "POST", url: "cms/banners", when: "Admin creates a banner", description: "Creates a new banner with title, images, link, publish status.", payload: { title: { en: "Summer Deal", ar: "..." }, image: "https://cdn.../new.jpg", mobileImage: "https://cdn.../new-m.jpg", link: "/offers/summer", isPublished: true } }));
  // 70
  parts.push(apiStep({ method: "PUT", url: "cms/banners/:id", when: "Admin updates a banner", description: "Updates banner details." }));
  // 71
  parts.push(apiStep({ method: "PATCH", url: "cms/banners/:id/reorder", when: "Admin reorders banners", description: "Updates the display order of a banner in the carousel." }));
  // 72
  parts.push(apiStep({ method: "DELETE", url: "cms/banners/:id", when: "Admin deletes a banner", description: "Removes a banner from the carousel." }));

  parts.push(subHeading("Offers (8 endpoints)"));
  // 73
  parts.push(apiStep({ method: "GET", url: "cms/offers", when: "Offers list page loads", description: "All promotional offers. Each can target specific movies, cinemas, dates, and user segments.", response: { data: [{ id: "01O...", title: "Buy 2 Get 1 Free", isPublished: true, startDate: "2026-01-01", endDate: "2026-03-31" }] } }));
  // 74
  parts.push(apiStep({ method: "GET", url: "cms/offers/:id", when: "Admin edits an offer", description: "Full offer detail including rules, images, targeting." }));
  // 75
  parts.push(apiStep({ method: "POST", url: "cms/offers", when: "Admin creates an offer", description: "Full offer creation: title, description, images, rules, discount type, dates, publish status." }));
  // 76
  parts.push(apiStep({ method: "PUT", url: "cms/offers/:id", when: "Admin updates an offer", description: "Updates offer details." }));
  // 77
  parts.push(apiStep({ method: "PATCH", url: "cms/offers/:offerId/:customUrl", when: "Admin publishes/unpublishes an offer", description: "Toggles publish status." }));
  // 78
  parts.push(apiStep({ method: "PATCH", url: "cms/offers/:offerId/meta-data", when: "Admin edits offer SEO", description: "Updates SEO metadata for an offer page." }));
  // 79
  parts.push(apiStep({ method: "PATCH", url: "cms/offers/:id/reorder", when: "Admin reorders offers", description: "Updates the display order of offers." }));
  // 80
  parts.push(apiStep({ method: "GET", url: "cms/offer-logs", when: "Admin views offer usage history", description: "Shows who used which offer, when, and how much discount was applied." }));
  // 81
  parts.push(apiStep({ method: "GET", url: "cms/offers/search", when: "Notification targeting (offers search)", description: "Searches offers by name. Used when creating push notifications targeted at offer participants." }));

  parts.push(subHeading("Offer Rules (6 endpoints)"));
  // 82
  parts.push(apiStep({ method: "GET", url: "cms/offer-rules", when: "Offer rules list loads", description: "All offer rules (reusable conditions like: min 2 tickets, specific cinema, specific day of week)." }));
  // 83
  parts.push(apiStep({ method: "GET", url: "cms/offer-rules/:id", when: "Admin edits an offer rule", description: "Single offer rule detail." }));
  // 84
  parts.push(apiStep({ method: "POST", url: "cms/offer-rules", when: "Admin creates an offer rule", description: "Creates a reusable offer rule.", payload: { name: "Weekend Only", conditions: { dayOfWeek: ["FRI", "SAT"] } } }));
  // 85
  parts.push(apiStep({ method: "PUT", url: "cms/offer-rules/:id", when: "Admin updates an offer rule", description: "Updates rule conditions." }));
  // 86
  parts.push(apiStep({ method: "DELETE", url: "cms/offer-rules/:id", when: "Admin deletes an offer rule", description: "Removes an offer rule." }));
  // 87
  parts.push(apiStep({ method: "PATCH", url: "cms/offer-rules/:offerRuleId/:customUrl", when: "Admin publishes/unpublishes a rule", description: "Toggles the publish status of an offer rule." }));

  parts.push(sectionDivider());

  // ── CH 7 — Users, Roles, Permissions ──────────────────────────────
  parts.push(chapter(7, "&#128101;", "Users, Roles & Permissions", "RBAC for the CMS &mdash; 10 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Not every CMS user can see everything. We have roles &mdash; Super Admin, Cinema Manager, Content Editor. Each role has specific permissions.&rdquo;</p>"));

  parts.push(flowDiagram([
    { label: "Permissions" },
    { label: "→ attached to Roles" },
    { label: "→ assigned to Users", highlight: true },
    { label: "→ checked on each route" },
  ]));

  parts.push(subHeading("Roles (5 endpoints)"));
  // 88
  parts.push(apiStep({ method: "GET", url: "cms/roles", when: "Roles list page loads", description: "All roles with names and permission counts.", response: { data: [{ id: 1, name: "Super Admin", permissionsCount: 48 }, { id: 2, name: "Cinema Manager", permissionsCount: 12 }] } }));
  // 89
  parts.push(apiStep({ method: "GET", url: "cms/roles/:id", when: "Admin edits a role", description: "Single role detail with attached permissions." }));
  // 90
  parts.push(apiStep({ method: "POST", url: "cms/roles", when: "Admin creates a role", description: "Creates a role with selected permissions.", payload: { name: "Content Editor", permissions: [3, 4, 7, 8] } }));
  // 91
  parts.push(apiStep({ method: "PUT", url: "cms/roles/:id", when: "Admin updates a role", description: "Updates role name and permissions." }));
  // 92
  parts.push(apiStep({ method: "GET", url: "cms/permissions", when: "Role form loads", description: "All available permissions. Each is a resource + action pair: <code>FILMS:READ</code>, <code>FILMS:UPDATE</code>, <code>ORDERS:READ</code>.", response: [{ id: 1, resource: "CMS_USER", action: "READ" }, { id: 2, resource: "FILMS", action: "UPDATE" }] }));

  parts.push(subHeading("CMS Users (4 endpoints)"));
  // 93
  parts.push(apiStep({ method: "GET", url: "cms/users/cms", when: "CMS Users list page loads", description: "Lists all admin/CMS users (not customers). Shows name, email, role, last login." }));
  // 94
  parts.push(apiStep({ method: "GET", url: "cms/users/:id", when: "Admin views a CMS user", description: "Single CMS user detail." }));
  // 95
  parts.push(apiStep({ method: "POST", url: "cms/users", when: "Admin invites a new CMS user", description: "Creates a CMS user account and sends an invitation email.", payload: { email: "newadmin@muvicinemas.com", firstName: "Ali", lastName: "Manager", roleId: 2 } }));
  // 96
  parts.push(apiStep({ method: "PUT", url: "cms/users/:id", when: "Admin updates a CMS user", description: "Updates user details or role assignment." }));

  // bonus: complaints belongs here
  // 97
  parts.push(apiStep({ method: "GET", url: "cms/contact-us", when: "Complaints page loads", description: "Lists all contact-us form submissions from the website. Shows name, email, subject, message, and date." }));

  parts.push(sectionDivider());

  // ── CH 8 — Customers, Orders, Refunds ────────────────────────────
  parts.push(chapter(8, "&#127915;", "Customers, Orders & Refunds", "Managing end-users and their bookings &mdash; 10 endpoints."));

  parts.push(subHeading("Customers (6 endpoints)"));
  // 98
  parts.push(apiStep({ method: "GET", url: "cms/users/customers", when: "Logged-in Customers page", description: "Lists all registered end-users. Shows name, email, phone, total bookings, wallet balance." }));
  // 99
  parts.push(apiStep({ method: "GET", url: "cms/users/customers/:id", when: "Admin views a customer", description: "Full customer profile." }));
  // 100
  parts.push(apiStep({ method: "PUT", url: "cms/users/customers/:id", when: "Admin updates a customer", description: "Updates customer details from the admin side." }));
  // 101
  parts.push(apiStep({ method: "POST", url: "cms/users/customers/:id/phone-number", when: "Admin updates customer phone", description: "Updates or corrects a customer&rsquo;s phone number." }));
  // 102
  parts.push(apiStep({ method: "POST", url: "cms/users/customers/:id/email", when: "Admin updates customer email", description: "Updates or corrects a customer&rsquo;s email address." }));
  // 103
  parts.push(apiStep({ method: "GET", url: "cms/guest-users", when: "Guest Customers page loads", description: "Lists guest checkout users who booked tickets without creating an account." }));

  parts.push(subHeading("Orders & Refunds (4 endpoints)"));
  // 104
  parts.push(apiStep({ method: "GET", url: "cms/orders", when: "Booked Tickets list loads", description: "All ticket orders. Filters: upcoming vs history, cinema, movie, date range.", response: { data: [{ id: "01ORD...", film: "MI8", cinema: "Mall of Arabia", totalAmount: 150.00, currency: "SAR", status: "CONFIRMED", seats: ["A1","A2","A3"] }] } }));
  // 105
  parts.push(apiStep({ method: "GET", url: "cms/orders/:id", when: "Admin views order detail", description: "Full order detail including seats, payment info, food orders." }));
  // 106
  parts.push(apiStep({ method: "POST", url: "cms/orders/:orderId/resend-order-email", when: "Admin clicks Resend Email", description: "Re-sends the booking confirmation email to the customer." }));
  // 107
  parts.push(apiStep({ method: "POST", url: "cms/refund-payment-requests", when: "Admin initiates a refund", description: "Creates a refund request for selected tickets in an order.", payload: { orderId: "01ORD...", ticketIds: ["t1", "t2"], reason: "Customer request" } }));
  // 108
  parts.push(apiStep({ method: "GET", url: "cms/private-bookings", when: "Private Bookings page loads", description: "Lists private/corporate booking requests submitted through the website." }));

  parts.push(sectionDivider());

  // ── CH 9 — F&B, Bank Accounts ────────────────────────────────────
  parts.push(chapter(9, "&#127839;", "Food & Beverages, Bank Accounts", "Concession management &mdash; 9 endpoints."));

  parts.push(subHeading("Food Menu (5 endpoints)"));
  parts.push(flowDiagram([
    { label: "Concession Tabs" },
    { label: "→ Menu Items" },
    { label: "→ Modifier Groups", highlight: true },
    { label: "→ Up-sell Items" },
  ]));
  // 109
  parts.push(apiStep({ method: "GET", url: "cms/food-menu", when: "Food Menu list loads", description: "All food menu items with prices, categories, and availability." }));
  // 110
  parts.push(apiStep({ method: "GET", url: "cms/food-menu/:id", when: "Admin edits a menu item", description: "Single menu item detail." }));
  // 111
  parts.push(apiStep({ method: "POST", url: "cms/food-menu", when: "Admin creates a menu item", description: "Creates a new food item.", payload: { name: { en: "Popcorn Large", ar: "..." }, price: 35, category: "POPCORN" } }));
  // 112
  parts.push(apiStep({ method: "PUT", url: "cms/food-menu/:id", when: "Admin updates a menu item", description: "Updates food item details." }));
  // 113
  parts.push(apiStep({ method: "DELETE", url: "cms/food-menu/:id", when: "Admin deletes a menu item", description: "Removes a food item from the menu." }));

  parts.push(subHeading("Bank Accounts (4 endpoints)"));
  // 114
  parts.push(apiStep({ method: "GET", url: "cms/bank-accounts", when: "Bank Accounts list loads", description: "Bank accounts used for payment settlements.", response: { data: [{ id: 1, bankName: "Al Rajhi Bank", iban: "SA44..." }] } }));
  // 115
  parts.push(apiStep({ method: "GET", url: "cms/bank-accounts/:id", when: "Admin edits a bank account", description: "Single bank account detail." }));
  // 116
  parts.push(apiStep({ method: "POST", url: "cms/bank-accounts", when: "Admin adds a bank account", description: "Creates a new bank account.", payload: { bankName: "Al Rajhi Bank", iban: "SA44...", accountName: "Muvi Cinemas" } }));
  // 117
  parts.push(apiStep({ method: "PUT", url: "cms/bank-accounts/:id", when: "Admin updates a bank account", description: "Updates bank account details." }));

  parts.push(sectionDivider());

  // ── CH 10 — Notifications ────────────────────────────────────────
  parts.push(chapter(10, "&#128276;", "Notifications & Push Templates", "Creating and sending push notifications &mdash; 8 endpoints."));

  // 118
  parts.push(apiStep({ method: "GET", url: "cms/notification-templates", when: "Notifications list loads", description: "All notification templates. Each has title, body, target audience, schedule.", response: { data: [{ id: "01N...", title: "New Movie Alert!", status: "DRAFT", scheduledAt: "2026-01-15T10:00:00Z" }] } }));
  // 119
  parts.push(apiStep({ method: "GET", url: "cms/notification-templates/:id", when: "Admin edits a notification", description: "Single notification template detail." }));
  // 120
  parts.push(apiStep({ method: "POST", url: "cms/notification-templates", when: "Admin creates a notification", description: "Creates a push notification template. Can target: all users, specific movie watchers, cinema visitors.", payload: { title: { en: "New Movie Alert!", ar: "..." }, body: { en: "MI8 is now showing", ar: "..." }, targetAudience: "ALL", scheduledAt: "2026-01-15T10:00:00Z" } }));
  // 121
  parts.push(apiStep({ method: "PATCH", url: "cms/notification-templates/:notificationId/publish", when: "Admin publishes a notification", description: "Sends/schedules the notification for delivery." }));

  parts.push(narrativeBlock("<p>&ldquo;When creating a notification, admins can target specific audiences. These APIs help with that...&rdquo;</p>"));

  parts.push(tipBox("The <code>GET cms/films/watched</code> and <code>GET cms/orders/most-visited</code> endpoints (Chapter 3) are also used here for audience targeting."));

  parts.push(sectionDivider());

  // ── CH 11 — SEO, Dynamic Pages, Onboarding ──────────────────────
  parts.push(chapter(11, "&#128196;", "SEO, Dynamic Pages & Onboarding", "Content management and app onboarding &mdash; 12 endpoints."));

  parts.push(subHeading("SEO / Page Metadata (4 endpoints)"));
  // 122
  parts.push(apiStep({ method: "GET", url: "cms/page-meta-data", when: "SEO list page loads", description: "SEO metadata for all pages: title, description, OG image.", response: { data: [{ id: 1, page: "HOME", title: "Muvi Cinemas | Book Movie Tickets Online" }] } }));
  // 123
  parts.push(apiStep({ method: "GET", url: "cms/page-meta-data/:id", when: "Admin edits page SEO", description: "Single page SEO detail." }));
  // 124
  parts.push(apiStep({ method: "PUT", url: "cms/page-meta-data/:id", when: "Admin updates page SEO", description: "Updates meta title, description, and OG image." }));

  parts.push(subHeading("Dynamic Pages (2 endpoints)"));
  // 125
  parts.push(apiStep({ method: "GET", url: "cms/dynamic-pages/:type", when: "Admin opens a dynamic page editor", description: "Gets content for About Us, Privacy Policy, T&amp;C, House Rules.", response: { content: { en: "<h1>About Muvi...</h1>", ar: "<h1>عن موفي...</h1>" } } }));
  // 126
  parts.push(apiStep({ method: "PUT", url: "cms/dynamic-pages/:type", when: "Admin saves dynamic page content", description: "Updates dynamic page content. Types: <code>about-us</code>, <code>privacy-policy</code>, <code>terms-and-conditions</code>, <code>house-rules</code>." }));

  parts.push(subHeading("Onboarding Slides (6 endpoints)"));
  // 127
  parts.push(apiStep({ method: "GET", url: "cms/onboarding-slides", when: "Onboarding list loads", description: "Mobile app onboarding slides. Shown to first-time app users.", response: { data: [{ id: 1, title: "Welcome to Muvi!", image: "https://cdn.../slide1.jpg", order: 1 }] } }));
  // 128
  parts.push(apiStep({ method: "GET", url: "cms/onboarding-slides/:id", when: "Admin edits a slide", description: "Single slide detail." }));
  // 129
  parts.push(apiStep({ method: "POST", url: "cms/onboarding-slides", when: "Admin creates a slide", description: "Creates a new onboarding slide.", payload: { title: { en: "Book Tickets", ar: "..." }, image: "https://cdn.../slide.jpg" } }));
  // 130
  parts.push(apiStep({ method: "PUT", url: "cms/onboarding-slides/:id", when: "Admin updates a slide", description: "Updates slide content." }));
  // 131
  parts.push(apiStep({ method: "DELETE", url: "cms/onboarding-slides/:id", when: "Admin deletes a slide", description: "Removes an onboarding slide." }));
  // 132
  parts.push(apiStep({ method: "PATCH", url: "cms/onboarding-slides/:dropId/reorder", when: "Admin reorders slides", description: "Updates the display order of onboarding slides via drag-and-drop." }));

  parts.push(subHeading("Voucher Redemption Steps (5 endpoints)"));
  // 133
  parts.push(apiStep({ method: "GET", url: "cms/voucher-redemption-steps", when: "Voucher steps list loads", description: "Step-by-step instructions for voucher redemption displayed on the website." }));
  // 134
  parts.push(apiStep({ method: "GET", url: "cms/voucher-redemption-steps/:id", when: "Admin edits a step", description: "Single step detail." }));
  // 135
  parts.push(apiStep({ method: "POST", url: "cms/voucher-redemption-steps", when: "Admin creates a step", description: "Creates a new redemption step." }));
  // 136
  parts.push(apiStep({ method: "PUT", url: "cms/voucher-redemption-steps/:id", when: "Admin updates a step", description: "Updates step content." }));
  // 137
  parts.push(apiStep({ method: "DELETE", url: "cms/voucher-redemption-steps/:id", when: "Admin deletes a step", description: "Removes a redemption step." }));

  parts.push(sectionDivider());

  // ── CH 12 — Logs, Files, Kiosks, Avatars, Misc ──────────────────
  parts.push(chapter(12, "&#128736;", "Logs, Files, Kiosks & Misc", "The remaining CMS tools &mdash; 14 endpoints."));

  parts.push(subHeading("Audit & Sync Logs (2 endpoints)"));
  // 138
  parts.push(apiStep({ method: "GET", url: "cms/audit-log", when: "Audit Logs page loads", description: "Every CMS action is logged: who did what, when. Shows user, action, resource, timestamp." }));
  // 139
  parts.push(apiStep({ method: "GET", url: "cms/sync-logs", when: "Sync Logs page loads", description: "History of Vista sync operations: films, cinemas, showtimes. Shows status, count, errors." }));

  parts.push(subHeading("File Upload (3 endpoints)"));
  // 140
  parts.push(apiStep({ method: "POST", url: "files", when: "Admin uploads a single file", description: "Uploads a file (image/video) and returns a CDN URL. Used across the entire CMS for any media upload.", payload: "(FormData with file)", response: { url: "https://cdn.muvicinemas.com/uploads/abc123.jpg" } }));
  // 141
  parts.push(apiStep({ method: "POST", url: "files/multiple", when: "Admin uploads multiple files", description: "Batch file upload. Returns array of CDN URLs.", response: [{ url: "https://cdn.../file1.jpg" }, { url: "https://cdn.../file2.jpg" }] }));
  // 142
  parts.push(apiStep({ method: "POST", url: "files/upload-pdf", when: "Admin uploads a PDF", description: "Specialized PDF upload endpoint (e.g., for terms documents)." }));

  parts.push(subHeading("Kiosk Management (5 endpoints)"));
  // 143
  parts.push(apiStep({ method: "GET", url: "cms/kiosks", when: "Kiosks list loads", description: "All kiosk terminals deployed in cinemas. Shows serial number, cinema, status.", response: { data: [{ id: "k1", serialNumber: "KSK-001", cinema: "Mall of Arabia", status: "ACTIVE" }] } }));
  // 144
  parts.push(apiStep({ method: "GET", url: "cms/kiosks/:id", when: "Admin edits a kiosk", description: "Single kiosk detail." }));
  // 145
  parts.push(apiStep({ method: "POST", url: "cms/kiosks", when: "Admin registers a kiosk", description: "Registers a new kiosk terminal.", payload: { serialNumber: "KSK-002", cinemaId: "01C..." } }));
  // 146
  parts.push(apiStep({ method: "PUT", url: "cms/kiosks/:id", when: "Admin updates a kiosk", description: "Updates kiosk configuration." }));
  // 147
  parts.push(apiStep({ method: "DELETE", url: "cms/kiosks/:id", when: "Admin decommissions a kiosk", description: "Removes a kiosk from the system." }));

  parts.push(subHeading("Avatars (4 endpoints)"));
  // 148
  parts.push(apiStep({ method: "GET", url: "cms/avatars", when: "Avatars list loads", description: "All avatar images that users can choose from.", response: { data: [{ id: 1, image: "https://cdn.../avatar1.png" }] } }));
  // 149
  parts.push(apiStep({ method: "GET", url: "cms/avatars/:id", when: "Admin edits an avatar", description: "Single avatar detail." }));
  // 150
  parts.push(apiStep({ method: "POST", url: "cms/avatars", when: "Admin uploads a new avatar", description: "Creates a new avatar option.", payload: { image: "https://cdn.../avatar-new.png" } }));
  // 151
  parts.push(apiStep({ method: "PUT", url: "cms/avatars/:id", when: "Admin updates an avatar", description: "Updates avatar image." }));

  parts.push(tipBox("That&rsquo;s all ~130 CMS endpoints covered! Now let&rsquo;s move to the customer-facing website..."));

  parts.push(sectionDivider());

  // ════════════════════════════════════════════════════════════════════
  //  PART II — WEBSITE
  // ════════════════════════════════════════════════════════════════════
  parts.push('<div class="part-header"><span class="part-label">Part II</span><span class="part-title">Website &mdash; The Customer Experience</span></div>');

  parts.push(narrativeBlock(
    "<p>Your team lead switches browsers. &ldquo;Now let&rsquo;s see what the customer sees. Open <code>https://muvicinemas.com</code>.&rdquo;</p>"
    + "<p>The website is a <strong>Next.js</strong> app (pages router) with SSR. It uses React Query + Axios, same base URL: <code>" + BASE + "</code>.</p>"
  ));

  // ── CH 13 — Website boots ─────────────────────────────────────────
  parts.push(chapter(13, "&#127758;", "Website Boots: Settings, Cities, Banners", "What fires when a customer opens muvicinemas.com &mdash; 6 endpoints."));

  parts.push(flowDiagram([
    { label: "User opens website" },
    { label: "GET settings", highlight: true },
    { label: "GET cities" },
    { label: "GET banners" },
    { label: "GET films" },
    { label: "Homepage renders!" },
  ]));

  // 152
  parts.push(apiStep({ method: "GET", url: "settings", when: "App initialization (every page)", description: "Platform-wide settings: checkout timeouts, maintenance mode, feature flags. If maintenance mode is on, entire site shows maintenance page.", response: { maintenanceMode: false, checkoutTimeoutMinutes: 10, appStoreUrl: "...", playStoreUrl: "..." } }));
  // 153
  parts.push(apiStep({ method: "GET", url: "cities", when: "App init &mdash; city selector", description: "All active cities. Website shows a city picker so users see movies and cinemas near them.", response: [{ id: "01X...", name: { en: "Riyadh", ar: "الرياض" }, lat: 24.7136, lng: 46.6753 }] }));
  // 154
  parts.push(apiStep({ method: "GET", url: "cities/cordinates", when: "Auto-detect nearest city", description: "Given the user&rsquo;s browser geolocation (lat/lng), returns the nearest city.", response: { id: "01X...", name: "Riyadh" } }));
  // 155
  parts.push(apiStep({ method: "GET", url: "banners", when: "Homepage hero carousel", description: "Active homepage banners for the carousel. Different images for desktop/mobile.", response: [{ id: 1, title: "Summer Blockbusters", desktopImage: "https://cdn.../d.jpg", mobileImage: "https://cdn.../m.jpg", link: "/offers/summer" }] }));
  // 156
  parts.push(apiStep({ method: "GET", url: "page-meta-data", when: "Each page load (SSR)", description: "SEO metadata for the current page: title, description, OG tags." }));
  // 157
  parts.push(apiStep({ method: "GET", url: "communication-languages", when: "Profile settings / language preferences", description: "Available communication languages for emails and SMS.", response: [{ id: 1, name: "English" }, { id: 2, name: "Arabic" }] }));

  parts.push(sectionDivider());

  // ── CH 14 — Signup, Login, OTP ────────────────────────────────────
  parts.push(chapter(14, "&#128241;", "Sign Up, Login & OTP", "Phone-based authentication with all verification flows &mdash; 22 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Unlike the CMS which uses email/password, the website uses <strong>phone number + OTP</strong>. When a user tries to book, they&rsquo;re asked to sign in.&rdquo;</p>"));

  parts.push(flowDiagram([
    { label: "User clicks Book" },
    { label: "Login modal opens" },
    { label: "Enter phone", highlight: true },
    { label: "POST auth/send-otp" },
    { label: "Enter OTP" },
    { label: "POST auth/verify-otp", highlight: true },
    { label: "New user? → Profile" },
    { label: "Authenticated!" },
  ]));

  parts.push(subHeading("Core Auth (10 endpoints)"));
  // 158
  parts.push(apiStep({ method: "POST", url: "auth/send-otp", when: "User enters phone and clicks Send Code", description: "Sends a one-time password (OTP) to the user&rsquo;s phone via SMS. Valid for limited time.", payload: { phoneNumber: "+966500000000" }, response: { message: "OTP sent", nextStep: "VERIFY_OTP" } }));
  // 159
  parts.push(apiStep({ method: "POST", url: "auth/verify-otp", when: "User enters the 6-digit OTP", description: "Verifies the OTP. New user → <code>nextStep: COMPLETE_PROFILE</code>. Returning user → returns token and user.", payload: { phoneNumber: "+966500000000", otp: "123456" }, response: { user: { id: "01U...", phoneNumber: "+966500000000", firstName: "Mohammed" }, token: "eyJhbG...", nextStep: "HOME" } }));
  // 160
  parts.push(apiStep({ method: "POST", url: "auth/profile", when: "New user completes profile", description: "Completes user profile with name, email, avatar.", payload: { firstName: "Mohammed", lastName: "Ali", email: "m.ali@example.com", avatarId: 3 } }));
  // 161
  parts.push(apiStep({ method: "GET", url: "auth/me", when: "After login / on each page load", description: "Fetches logged-in user profile: name, avatar, wallet balance.", response: { user: { id: "01U...", firstName: "Mohammed", lastName: "Ali", avatar: "https://cdn.../a3.png" } } }));
  // 162
  parts.push(apiStep({ method: "POST", url: "auth/add-token", when: "After login (push notification setup)", description: "Registers the user&rsquo;s FCM push notification token.", payload: { token: "fcm_token_string", platform: "web" } }));
  // 163
  parts.push(apiStep({ method: "POST", url: "auth/logout", when: "User logs out", description: "Invalidates the refresh token and unregisters the push notification token." }));
  // 164
  parts.push(apiStep({ method: "DELETE", url: "auth/delete-account", when: "User deletes their account", description: "Permanently deletes the user account and all associated data." }));
  // 165
  parts.push(apiStep({ method: "POST", url: "auth/unverified-user", when: "Handle unverified user state", description: "Creates/updates an unverified user record during the signup flow." }));
  // 166
  parts.push(apiStep({ method: "POST", url: "auth/forget-password", when: "User clicks Forgot Password", description: "Sends a password reset code via SMS.", payload: { phoneNumber: "+966500000000" } }));
  // 167
  parts.push(apiStep({ method: "POST", url: "auth/reset-password-code", when: "User enters reset code", description: "Verifies the reset code.", payload: { phoneNumber: "+966500000000", code: "123456" } }));
  // 168
  parts.push(apiStep({ method: "POST", url: "auth/reset-password-confirmation", when: "User sets new password", description: "Sets the new password after code verification.", payload: { password: "NewP@ssword!" } }));

  parts.push(subHeading("Email Verification & Change (7 endpoints)"));
  // 169
  parts.push(apiStep({ method: "POST", url: "auth/send-login-email-verification-code", when: "Old user needs email verification during login", description: "Sends an email verification code for old users migrating to the new auth system." }));
  // 170
  parts.push(apiStep({ method: "POST", url: "auth/send-email-verification-code", when: "User initiates email change", description: "Sends a verification code to the NEW email address when changing email." }));
  // 171
  parts.push(apiStep({ method: "POST", url: "auth/verify-email-old-user", when: "Old user verifies email", description: "Verifies the email OTP for existing (old) users during migration." }));
  // 172
  parts.push(apiStep({ method: "POST", url: "auth/verify-change-email-old-user", when: "Old user verifies NEW email during change", description: "Verifies the OTP sent to the new email for old users changing their email." }));
  // 173
  parts.push(apiStep({ method: "POST", url: "auth/verify-email-new-user", when: "New user verifies email during signup", description: "Verifies the email for a brand new user signing up." }));
  // 174
  parts.push(apiStep({ method: "POST", url: "auth/change-email-verification-code", when: "Verify OTP for email change", description: "Verifies the confirmation code for an email change request." }));
  // 175
  parts.push(apiStep({ method: "PATCH", url: "auth/change-email", when: "Final step of email change", description: "Actually changes the user&rsquo;s email after all verification steps are complete." }));

  parts.push(subHeading("Phone Change & Misc (5 endpoints)"));
  // 176
  parts.push(apiStep({ method: "POST", url: "auth/verify-phonenumber", when: "User verifies new phone number", description: "Verifies OTP sent to a new phone number during phone change." }));
  // 177
  parts.push(apiStep({ method: "POST", url: "auth/change-phonenumber-verification-code", when: "User initiates phone number change", description: "Sends a verification code to the new phone number." }));
  // 178
  parts.push(apiStep({ method: "POST", url: "auth/verify-email", when: "Generic email verification", description: "Verifies an email verification code (used in change-email flow)." }));
  // 179
  parts.push(apiStep({ method: "POST", url: "auth/init-change-email", when: "User starts email change from profile", description: "Initiates the email change process. Sends OTP to current email first." }));

  parts.push(subHeading("Guest Checkout Verification (2 endpoints)"));
  // 180
  parts.push(apiStep({ method: "POST", url: "guest-users/phone-number", when: "Guest checkout &mdash; enter phone", description: "Verifies the guest&rsquo;s phone number and sends an OTP.", payload: { phoneNumber: "+966500000000" } }));
  // 181
  parts.push(apiStep({ method: "POST", url: "guest-users/verify", when: "Guest checkout &mdash; enter OTP", description: "Verifies the guest OTP and returns a temporary token for the booking.", payload: { phoneNumber: "+966500000000", otp: "123456" } }));

  // 182
  parts.push(apiStep({ method: "POST", url: "auth/init-verify-email-user", when: "Init email verification (wallet)", description: "Initiates email verification for wallet-related operations." }));
  // 183
  parts.push(apiStep({ method: "POST", url: "auth/verify-email-user", when: "Complete email verification (wallet)", description: "Completes email verification for wallet operations." }));

  parts.push(sectionDivider());

  // ── CH 15 — Browsing Movies ────────────────────────────────────────
  parts.push(chapter(15, "&#127916;", "Browsing Movies", "Movie listing, detail pages, and showtimes &mdash; 12 endpoints."));

  parts.push(flowDiagram([
    { label: "Homepage" },
    { label: "Click movie poster" },
    { label: "GET films/:slug", highlight: true },
    { label: "Movie Detail Page" },
    { label: "GET films/:id/cinemas" },
    { label: "Select cinema + time", highlight: true },
  ]));

  // 184
  parts.push(apiStep({ method: "GET", url: "films", when: "Homepage &mdash; Now Showing / Coming Soon", description: "Movies filtered by bookmark. Paginated. Shows poster, title, rating, genres.", response: { data: [{ id: "01A...", title: "Mission Impossible 8", poster: "https://cdn.../mi8.jpg", rating: "PG-13", genres: ["Action"] }], total: 12 } }));
  // 185
  parts.push(apiStep({ method: "GET", url: "films (infinite)", when: "Movies page with infinite scroll", description: "Same endpoint but uses <code>createInfiniteQuery</code> for infinite scrolling on the all-movies page." }));
  // 186
  parts.push(apiStep({ method: "GET", url: "films/unique-name/:slug", when: "User clicks a movie", description: "Full movie detail by slug (SEO-friendly URL). Shows title, description, trailer, cast, genres, rating, duration.", response: { id: "01A...", title: "Mission Impossible 8", description: "Ethan Hunt faces...", trailer: "https://youtube.com/...", cast: [{ name: "Tom Cruise", photo: "..." }], rating: "PG-13", duration: 165 } }));
  // 187
  parts.push(apiStep({ method: "GET", url: "films/:id", when: "Movie detail (by ID)", description: "Same movie detail but accessed by ID instead of slug." }));
  // 188
  parts.push(apiStep({ method: "GET", url: "films/:id/cinemas", when: "Movie detail &mdash; cinema list", description: "Which cinemas are showing this movie? Returns cinemas with showtimes grouped by date." }));
  // 189
  parts.push(apiStep({ method: "GET", url: "cinemas/film-filters", when: "Movie detail &mdash; cinema filter", description: "Available cinema filters for the selected movie: which cities, which cinemas." }));
  // 190
  parts.push(apiStep({ method: "GET", url: "experiences/film-filters", when: "Movie detail &mdash; experience filter", description: "Available experiences for the selected movie (IMAX, VIP, etc.)." }));
  // 191
  parts.push(apiStep({ method: "POST", url: "films/:id/:customUrl", when: "User clicks Remind Me (coming soon)", description: "Sets a reminder for a movie. <code>:customUrl</code> = <code>remind-me</code>.", headers: [{ name: "Authorization", value: "Bearer eyJhbG..." }] }));
  // 192
  parts.push(apiStep({ method: "DELETE", url: "films/:id/:customUrl", when: "User removes reminder", description: "Removes a previously set movie reminder." }));
  // 193
  parts.push(apiStep({ method: "GET", url: "films/slug", when: "Sitemap generation (SSR)", description: "All movie slugs for generating the sitemap.xml." }));
  // 194
  parts.push(apiStep({ method: "GET", url: "films/offer", when: "Offer detail &mdash; applicable movies", description: "Movies that a specific offer applies to. Used on offer detail pages (infinite query)." }));
  // 195
  parts.push(apiStep({ method: "GET", url: "films/showtimes", when: "Cinema detail &mdash; movies by date", description: "Movies showing at a cinema on a specific date (infinite query)." }));

  parts.push(sectionDivider());

  // ── CH 16 — Movie Finder ────────────────────────────────────────────
  parts.push(chapter(16, "&#128270;", "Movie Finder & Search", "The powerful multi-filter search &mdash; 11 endpoints."));

  parts.push(flowDiagram([
    { label: "Open Movie Finder" },
    { label: "GET .../dates" },
    { label: "GET .../filters/films" },
    { label: "GET .../filters/cinemas" },
    { label: "Select filters", highlight: true },
    { label: "GET film-finder" },
    { label: "Results!" },
  ]));

  // 196
  parts.push(apiStep({ method: "GET", url: "film-finder/dates", when: "Movie Finder page loads", description: "Available dates that have showtimes. Populates the date picker." }));
  // 197
  parts.push(apiStep({ method: "GET", url: "film-finder/filters/films", when: "Movie Finder loads", description: "Available movies for the film filter, based on city and date." }));
  // 198
  parts.push(apiStep({ method: "GET", url: "film-finder/filters/cinemas", when: "Movie Finder loads", description: "Available cinemas for the cinema filter." }));
  // 199
  parts.push(apiStep({ method: "GET", url: "film-finder/filters/experiences", when: "Movie Finder loads", description: "Available experiences for the experience filter." }));
  // 200
  parts.push(apiStep({ method: "GET", url: "film-finder/result-count", when: "User changes any filter", description: "Returns count of matching showtimes before loading full results. Shows &ldquo;42 showtimes found&rdquo;." }));
  // 201
  parts.push(apiStep({ method: "GET", url: "film-finder", when: "User clicks Show Results", description: "Full search results: matching showtimes grouped by movie. Infinite query." }));
  // 202
  parts.push(apiStep({ method: "GET", url: "film-finder/search", when: "User types in search bar", description: "Text search across movies and cinemas. Returns results as the user types (debounced)." }));
  // 203
  parts.push(apiStep({ method: "GET", url: "recent-searches", when: "Search bar focused", description: "User&rsquo;s recent search history." }));
  // 204
  parts.push(apiStep({ method: "POST", url: "recent-searches", when: "User selects a search result", description: "Saves the search term to history." }));
  // 205
  parts.push(apiStep({ method: "DELETE", url: "recent-searches", when: "User clears search history", description: "Clears all recent searches." }));
  // 206
  parts.push(apiStep({ method: "GET", url: "film-finder/films/:id/cinemas", when: "Finder &mdash; cinemas for a film", description: "Cinemas showing a specific film (used in finder sub-navigation)." }));

  parts.push(sectionDivider());

  // ── CH 17 — Cinemas & Experiences ─────────────────────────────────
  parts.push(chapter(17, "&#127963;", "Cinemas & Experiences", "Cinema listing, details, and showtimes &mdash; 6 endpoints."));

  // 207
  parts.push(apiStep({ method: "GET", url: "cinemas", when: "Cinemas listing page", description: "All cinemas with city, address, experiences. The cinema directory." }));
  // 208
  parts.push(apiStep({ method: "GET", url: "cinemas/unique-name/:slug", when: "Cinema detail page", description: "Full cinema info: name, description, images, address, map, available movies.", response: { id: "01C...", name: { en: "Muvi Mall of Arabia" }, address: "...", lat: 21.5, lng: 39.1, images: ["..."], experiences: ["IMAX", "VIP"] } }));
  // 209
  parts.push(apiStep({ method: "GET", url: "showtimes", when: "Cinema detail &mdash; showtimes for a date", description: "Showtimes at a specific cinema, filtered by date." }));
  // 210
  parts.push(apiStep({ method: "GET", url: "showtimes/:id", when: "Showtime detail (before booking)", description: "Full session details: movie, cinema, screen, experience, date, time, price tiers." }));
  // 211
  parts.push(apiStep({ method: "GET", url: "experiences", when: "Experience filter on homepage", description: "All cinema experiences for the filter dropdown: IMAX, VIP, 4DX, Standard.", response: [{ id: 1, name: "IMAX" }, { id: 2, name: "VIP" }] }));
  // 212
  parts.push(apiStep({ method: "GET", url: "experiences/unique-name/:slug", when: "Experience detail page", description: "Full experience info: description, images, which cinemas have it." }));

  parts.push(sectionDivider());

  // ── CH 18 — Booking ──────────────────────────────────────────────
  parts.push(chapter(18, "&#127922;", "Booking a Ticket", "The complete seat selection and ordering flow &mdash; 14 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;This is the money flow. When a user selects a showtime, the booking journey begins...&rdquo;</p>"));

  parts.push(flowDiagram([
    { label: "Select showtime" },
    { label: "GET .../seats", highlight: true },
    { label: "Select seats" },
    { label: "POST orders", highlight: true },
    { label: "POST orders/:id/seats" },
    { label: "Add food?" },
    { label: "Apply offer?" },
    { label: "Pay!", highlight: true },
  ]));

  // 213
  parts.push(apiStep({ method: "GET", url: "showtimes/:sessionId/seats", when: "Seat map page loads", description: "Full seat map for the screen. Each seat: row, number, status (available/taken/blocked), type, price.", response: { seats: [{ row: "A", number: 1, status: "AVAILABLE", type: "STANDARD", price: 50 }], areas: [{ id: "area-1", name: "Standard", price: 50 }] } }));
  // 214
  parts.push(apiStep({ method: "POST", url: "showtimes/:sessionId/share-seats", when: "User shares seat layout", description: "Generates a shareable seat map image/link." }));
  // 215
  parts.push(apiStep({ method: "POST", url: "orders", when: "User clicks Continue after selecting seats", description: "Creates a new order (reservation). Locks selected seats for the checkout timeout.", payload: { sessionId: "01S...", seats: [{ row: "A", number: 1 }, { row: "A", number: 3 }] }, response: { id: "01ORD...", status: "PENDING", expiresAt: "2026-01-15T14:32:00Z", totalAmount: 100, currency: "SAR" } }));
  // 216
  parts.push(apiStep({ method: "POST", url: "orders/:orderId/seats", when: "Confirming seat selection", description: "Confirms the selected seats for the order. Prices finalized." }));
  // 217
  parts.push(apiStep({ method: "GET", url: "orders/:id", when: "Order summary page loads", description: "Full order detail with seats, prices, applicable offers." }));

  parts.push(warningBox("The order has a checkout timeout (typically 10 minutes). If the user doesn&rsquo;t pay in time, seats are automatically released."));

  parts.push(subHeading("Offers during checkout (4 endpoints)"));
  // 218
  parts.push(apiStep({ method: "GET", url: "offers/check-film", when: "Checkout page loads", description: "Checks if any offers apply to this movie/cinema/date combo.", response: [{ id: "01O...", title: "Buy 2 Get 1 Free", discountType: "PERCENTAGE", discountValue: 33 }] }));
  // 219
  parts.push(apiStep({ method: "POST", url: "offers/:offerId/calculate", when: "User applies an offer", description: "Calculates the discount for the selected offer.", payload: { orderId: "01ORD..." }, response: { originalTotal: 150, discountAmount: 50, finalTotal: 100 } }));
  // 220
  parts.push(apiStep({ method: "DELETE", url: "orders/:id/offers", when: "User removes applied offer", description: "Removes the applied offer from the order." }));
  // 221
  parts.push(apiStep({ method: "GET", url: "orders/:id/offers/check-card", when: "Check card-specific offer", description: "Checks if a card-specific offer (like bank promos) applies to the order." }));

  parts.push(subHeading("Food add-on (1 endpoint)"));
  // 222
  parts.push(apiStep({ method: "GET", url: "food-menu?page=1&limit=100", when: "F&amp;B upsell page after booking", description: "Food and beverage menu so the user can add snacks." }));

  parts.push(subHeading("Guest Booking (2 endpoints)"));
  // 223
  parts.push(apiStep({ method: "GET", url: "guest-users/orders/:id", when: "Guest views their order", description: "Order detail for guest users (no auth required, just order ID)." }));
  // 224
  parts.push(apiStep({ method: "POST", url: "guest-users/orders/:id/pay", when: "Guest pays for their order", description: "Payment for guest users. Same as regular pay but with guest token." }));

  parts.push(sectionDivider());

  // ── CH 19 — Payment & Cards ──────────────────────────────────────
  parts.push(chapter(19, "&#128179;", "Payment & Credit Cards", "Card management, payment processing &mdash; 12 endpoints."));

  parts.push(flowDiagram([
    { label: "Select payment" },
    { label: "GET cards", highlight: true },
    { label: "Choose card" },
    { label: "POST orders/:id/pay" },
    { label: "3DS?" },
    { label: "CONFIRMED!", highlight: true },
  ]));

  parts.push(subHeading("Card Management (6 endpoints)"));
  // 225
  parts.push(apiStep({ method: "GET", url: "cards", when: "Payment page / Cards settings", description: "User&rsquo;s saved credit/debit cards.", response: [{ id: "c1", last4: "4242", brand: "VISA", expiryMonth: 12, expiryYear: 2027 }] }));
  // 226
  parts.push(apiStep({ method: "GET", url: "cards/initialize-add-card", when: "User clicks Add Card", description: "Initializes the add-card flow. Returns a form token for the payment gateway." }));
  // 227
  parts.push(apiStep({ method: "GET", url: "cards/hyper-pay/initialize-add-card", when: "Add card via HyperPay gateway", description: "Initializes HyperPay-specific card tokenization." }));
  // 228
  parts.push(apiStep({ method: "GET", url: "cards/payfort/initialize-add-card", when: "Add card via PayFort gateway", description: "Initializes PayFort-specific card tokenization." }));
  // 229
  parts.push(apiStep({ method: "POST", url: "cards", when: "Card tokenization complete", description: "Saves the tokenized card to the user&rsquo;s account." }));
  // 230
  parts.push(apiStep({ method: "PUT", url: "cards/:id", when: "User updates card nickname", description: "Updates card display name." }));
  // 231
  parts.push(apiStep({ method: "DELETE", url: "cards/:id", when: "User removes a saved card", description: "Deletes the card from the user&rsquo;s account." }));

  parts.push(subHeading("Mada & Payment Processing (3 endpoints)"));
  // 232
  parts.push(apiStep({ method: "POST", url: "cards/check-if-mada-card", when: "User enters card number", description: "Checks if BIN is a Mada card. Mada requires different processing in KSA.", payload: { bin: "588845" }, response: { isMada: true } }));
  // 233
  parts.push(apiStep({ method: "POST", url: "orders/:id/pay", when: "User confirms payment", description: "Initiates payment. If 3DS required, returns redirect URL. On success, order becomes CONFIRMED.", payload: { paymentMethod: "CARD", cardId: "c1" }, response: { status: "CONFIRMED", orderId: "01ORD...", tickets: [{ seat: "A1", qrCode: "data:image/png;base64,..." }] } }));
  // 234
  parts.push(apiStep({ method: "POST", url: "cards/validate-apple-session", when: "Apple Pay", description: "Validates the Apple Pay merchant session." }));
  // 235
  parts.push(apiStep({ method: "POST", url: "cards/create-apple-session", when: "Apple Pay session creation", description: "Creates an Apple Pay payment session." }));

  parts.push(subHeading("Guest Card Initialization (2 endpoints)"));
  // 236
  parts.push(apiStep({ method: "POST", url: "guest-users/cards/hyper-pay/initialize-add-card", when: "Guest adds card via HyperPay", description: "HyperPay card tokenization for guest checkout users." }));
  // 237
  parts.push(apiStep({ method: "POST", url: "guest-users/cards/payfort/initialize-add-card", when: "Guest adds card via PayFort", description: "PayFort card tokenization for guest checkout users." }));

  parts.push(subHeading("STC Pay (1 endpoint)"));
  // 238
  parts.push(apiStep({ method: "POST", url: "stc-pay/verification-code", when: "User pays with STC Pay", description: "Initiates STC Pay: sends verification to the user&rsquo;s STC number.", payload: { phoneNumber: "+966500000000", orderId: "01ORD..." } }));

  parts.push(sectionDivider());

  // ── CH 20 — My Bookings & Cancellations ──────────────────────────
  parts.push(chapter(20, "&#127903;", "My Bookings & Cancellations", "Order history, sharing, and ticket cancellation &mdash; 10 endpoints."));

  // 239
  parts.push(apiStep({ method: "GET", url: "orders", when: "My Bookings page loads", description: "All user bookings: upcoming movies, past visits. Each has movie details, cinema, date, seats, QR code." }));
  // 240
  parts.push(apiStep({ method: "GET", url: "orders/:id (imperative)", when: "User clicks a booking / notification opens order", description: "Full booking detail (on-demand fetch via mutation pattern for notification deep links)." }));
  // 241
  parts.push(apiStep({ method: "POST", url: "orders/:id/share-ticket", when: "User shares their ticket", description: "Generates a shareable link/image of the ticket." }));
  // 242
  parts.push(apiStep({ method: "POST", url: "guest-users/orders/:id/share-ticket", when: "Guest shares their ticket", description: "Same as above but for guest bookings." }));
  // 243
  parts.push(apiStep({ method: "POST", url: "orders/:id/:customUrl", when: "User sets order reminder", description: "Sets a reminder for the movie date. <code>:customUrl</code> = <code>remind-me</code>." }));
  // 244
  parts.push(apiStep({ method: "DELETE", url: "orders/:id/:customUrl", when: "User removes order reminder", description: "Removes the reminder." }));

  parts.push(subHeading("Cancellation Flow (4 endpoints)"));
  // 245
  parts.push(apiStep({ method: "GET", url: "orders/:orderId/check-cancel", when: "User wants to cancel", description: "Checks if this order is eligible for cancellation (time-based policy).", response: { canCancel: true, refundAmount: 100, refundTo: "WALLET" } }));
  // 246
  parts.push(apiStep({ method: "GET", url: "cancellation-reasons", when: "Cancel dialog opens", description: "Available cancellation reasons.", response: [{ id: "r1", text: "Changed my plans" }, { id: "r2", text: "Booked wrong showtime" }] }));
  // 247
  parts.push(apiStep({ method: "POST", url: "orders/:orderId/cancel", when: "User confirms cancellation", description: "Cancels the order. Refund processed to wallet or original payment method.", payload: { reasonId: "r1" } }));
  // (duplicate cancel in cashback feature uses same endpoint)

  parts.push(sectionDivider());

  // ── CH 21 — Wallet & Top-ups ──────────────────────────────────────
  parts.push(chapter(21, "&#128176;", "Wallet & Top-ups", "Digital wallet management &mdash; 8 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;The wallet is a key feature. Refunds go to the wallet, and users can top it up with a card to pay for future bookings.&rdquo;</p>"));

  // 248
  parts.push(apiStep({ method: "GET", url: "wallet/balance", when: "Wallet page / header badge", description: "Current wallet balance.", response: { balance: 250.00, currency: "SAR" } }));
  // 249
  parts.push(apiStep({ method: "GET", url: "wallet", when: "Wallet transactions page", description: "Transaction history: top-ups, payments, refunds. Paginated." }));
  // 250
  parts.push(apiStep({ method: "GET", url: "wallet (infinite)", when: "Wallet with infinite scroll", description: "Same endpoint with <code>createInfiniteQuery</code> for endless scrolling." }));
  // 251
  parts.push(apiStep({ method: "GET", url: "wallet/expired", when: "Expired wallet transactions", description: "Expired wallet amounts (infinite query). Wallet credits have an expiration date." }));
  // 252
  parts.push(apiStep({ method: "GET", url: "wallet/detailed-balance", when: "Wallet balance breakdown", description: "Breakdown: available balance, pending refunds, expiring amounts." }));
  // 253
  parts.push(apiStep({ method: "POST", url: "top-ups", when: "User clicks Add Money", description: "Creates a pending wallet top-up.", payload: { amount: 100 }, response: { id: "tu1", amount: 100, status: "PENDING" } }));
  // 254
  parts.push(apiStep({ method: "GET", url: "top-ups/:topUpId", when: "Top-up detail loads", description: "Top-up detail for pending review." }));
  // 255
  parts.push(apiStep({ method: "POST", url: "top-ups/:topUpId/pay", when: "User pays top-up", description: "Processes payment for the wallet top-up using a saved card." }));

  parts.push(sectionDivider());

  // ── CH 22 — Cashback ──────────────────────────────────────────────
  parts.push(chapter(22, "&#128184;", "Cashback", "Cashback rewards system &mdash; 4 endpoints."));

  parts.push(narrativeBlock("<p>&ldquo;Cashback is separate from the wallet. Users earn cashback on eligible purchases, and it can expire.&rdquo;</p>"));

  // 256
  parts.push(apiStep({ method: "GET", url: "cashback/balance", when: "Cashback page loads", description: "Current cashback balance.", response: { balance: 25.00, currency: "SAR" } }));
  // 257
  parts.push(apiStep({ method: "GET", url: "cashback", when: "Cashback transactions", description: "Cashback transaction history (infinite query)." }));
  // 258
  parts.push(apiStep({ method: "GET", url: "cashback/expired", when: "Expired cashback", description: "Expired cashback amounts (infinite query)." }));

  parts.push(tipBox("Cashback also reuses <code>POST orders/:orderId/cancel</code> and email verification endpoints from the wallet feature."));

  parts.push(sectionDivider());

  // ── CH 23 — Offers & Vouchers ─────────────────────────────────────
  parts.push(chapter(23, "&#127915;", "Offers & Vouchers", "Promotions on the website side &mdash; 10 endpoints."));

  parts.push(subHeading("Offers (7 endpoints)"));
  // 259
  parts.push(apiStep({ method: "GET", url: "offers", when: "Offers listing page", description: "Active offers for the website.", response: [{ id: "01O...", title: "Buy 2 Get 1 Free", image: "...", validUntil: "2026-03-31" }] }));
  // 260
  parts.push(apiStep({ method: "GET", url: "offers/unique-name/:slug", when: "Offer detail page", description: "Full offer details by slug with terms, conditions, applicable movies/cinemas." }));
  // 261
  parts.push(apiStep({ method: "GET", url: "offers/:offerId", when: "Offer detail by ID", description: "Full offer detail by ID." }));
  // 262
  parts.push(apiStep({ method: "GET", url: "offers/:offerId/showtimes", when: "Offer detail &mdash; available showtimes", description: "Showtimes available for a specific offer. Shows when/where the offer applies." }));
  // 263
  parts.push(apiStep({ method: "GET", url: "offers/:offerId/verify", when: "Verify offer applicability", description: "Verifies if an offer is still valid and can be applied to the current order (imperative GET)." }));

  parts.push(subHeading("Vouchers (4 endpoints)"));
  // 264
  parts.push(apiStep({ method: "GET", url: "orders/:orderId/voucher/verify", when: "User enters voucher code", description: "Validates the voucher code and returns its value.", response: { valid: true, value: 50, type: "FIXED" } }));
  // 265
  parts.push(apiStep({ method: "POST", url: "orders/:orderId/voucher", when: "User applies voucher", description: "Attaches the voucher to the order." }));
  // 266
  parts.push(apiStep({ method: "DELETE", url: "orders/:orderId/voucher", when: "User removes voucher", description: "Removes the applied voucher from the order." }));
  // 267
  parts.push(apiStep({ method: "GET", url: "orders/:orderId/voucher/calculate", when: "Calculate multiple vouchers", description: "Calculates the total discount when multiple vouchers are applied." }));

  parts.push(sectionDivider());

  // ── CH 24 — Profile, Notifications & Everything Else ─────────────
  parts.push(chapter(24, "&#128100;", "Profile, Notifications & Everything Else", "The remaining website endpoints &mdash; 27 endpoints."));

  parts.push(subHeading("Profile & User Settings (5 endpoints)"));
  // 268
  parts.push(apiStep({ method: "PUT", url: "auth/profile", when: "User updates profile", description: "Updates name, email, avatar.", payload: { firstName: "Mohammed", lastName: "Ali", avatarId: 5 } }));
  // 269
  parts.push(apiStep({ method: "PATCH", url: "users/cities", when: "User changes preferred city", description: "Updates the default city for movie/cinema listings." }));
  // 270
  parts.push(apiStep({ method: "PATCH", url: "users/language", when: "User switches app language (EN/AR)", description: "Updates the app language preference." }));
  // 271
  parts.push(apiStep({ method: "PATCH", url: "users/communication-language", when: "User changes communication language", description: "Updates the language for emails and SMS notifications." }));
  // 272
  parts.push(apiStep({ method: "GET", url: "avatars", when: "Profile / signup avatar picker", description: "Available avatar images.", response: [{ id: 1, image: "https://cdn.../a1.png" }, { id: 2, image: "https://cdn.../a2.png" }] }));

  parts.push(subHeading("Notifications (5 endpoints)"));
  // 273
  parts.push(apiStep({ method: "GET", url: "notifications", when: "Notifications page loads", description: "User&rsquo;s push notifications (infinite query): new movies, confirmations, offers." }));
  // 274
  parts.push(apiStep({ method: "GET", url: "notifications/unread/count", when: "App header (always)", description: "Unread notification count for the bell icon badge.", response: { count: 3 } }));
  // 275
  parts.push(apiStep({ method: "PUT", url: "notifications/:id/make-read", when: "User opens a notification", description: "Marks a notification as read." }));
  // 276
  parts.push(apiStep({ method: "PUT", url: "notifications/make-read/notification-template/:id", when: "Push notification opened", description: "Marks a push notification as read by template ID (used when notification is opened from system tray)." }));
  // 277
  parts.push(apiStep({ method: "DELETE", url: "notifications/:id", when: "User deletes a notification", description: "Removes a notification from the list." }));

  parts.push(subHeading("File Upload (2 endpoints)"));
  // 278
  parts.push(apiStep({ method: "POST", url: "files", when: "User uploads profile photo, etc.", description: "Uploads a single file and returns CDN URL.", payload: "(FormData with file)", response: { url: "https://cdn.../upload.jpg" } }));
  // 279
  parts.push(apiStep({ method: "POST", url: "files/multiple", when: "User uploads multiple files", description: "Batch file upload." }));

  parts.push(subHeading("Static Pages & Content (5 endpoints)"));
  // 280
  parts.push(apiStep({ method: "GET", url: "dynamic-pages/:type", when: "About Us / Privacy / T&amp;C page", description: "Content for static pages. Types: about-us, privacy-policy, terms-and-conditions, house-rules." }));
  // 281
  parts.push(apiStep({ method: "GET", url: "voucher-redemption-steps", when: "Voucher redemption page", description: "Step-by-step instructions for voucher redemption." }));
  // 282
  parts.push(apiStep({ method: "POST", url: "contact-us", when: "User submits Contact Us form", description: "Sends a complaint/inquiry.", payload: { name: "Mohammed", email: "m@example.com", subject: "Question", message: "When will IMAX be in Jeddah?" } }));
  // 283
  parts.push(apiStep({ method: "POST", url: "private-bookings", when: "User submits private booking request", description: "Creates a private/corporate booking inquiry.", payload: { name: "...", email: "...", companyName: "...", date: "2026-02-01", guestCount: 50 } }));

  parts.push(sectionDivider());

  // ── EPILOGUE
  parts.push('<div class="epilogue">');
  parts.push('<div class="epilogue-counter">' + stepCounter + ' API endpoints documented</div>');
  parts.push('<h2 class="epilogue-title">That&rsquo;s the full story! &#127881;</h2>');
  parts.push('<p class="epilogue-text">You&rsquo;ve walked through every API flow in the Muvi Cinemas platform &mdash; from CMS admin operations to the end-user booking journey. Every single endpoint from both the CMS (~130) and Website (~142) apps has been explained in context.</p>');
  parts.push('<div class="epilogue-stats">');
  parts.push('<div class="epilogue-stat"><span class="epilogue-stat-num">24</span><span class="epilogue-stat-label">Chapters</span></div>');
  parts.push('<div class="epilogue-stat"><span class="epilogue-stat-num">2</span><span class="epilogue-stat-label">Applications</span></div>');
  parts.push('<div class="epilogue-stat"><span class="epilogue-stat-num">63</span><span class="epilogue-stat-label">Service Dirs</span></div>');
  parts.push('<div class="epilogue-stat"><span class="epilogue-stat-num">' + stepCounter + '</span><span class="epilogue-stat-label">API Steps</span></div>');
  parts.push('</div>');
  parts.push('<p class="epilogue-text">For the interactive endpoint reference with Try-it buttons, check the <a href="api.html">API Reference</a>.</p>');
  parts.push("</div>");

  return parts.join("\n");
}

/* ════════════════════════════════════════════════════════════════════
   HTML TEMPLATE
   ════════════════════════════════════════════════════════════════════ */

function buildPage() {
  var story = buildStory();

  return '<!doctype html>\n<html lang="en">\n<head>\n'
    + '<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
    + '<title>Muvi Cinemas — API Storybook</title>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@300;400;600;700&display=swap" rel="stylesheet">\n'
    + '<style>\n'
    + css()
    + '\n</style>\n</head>\n<body>\n'
    + '<div class="page">\n'
    + story
    + '\n</div>\n</body>\n</html>\n';
}

function css() {
  return [
    "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
    'body { font-family: "Sora", system-ui, sans-serif; background: #0B0F1A; color: #c8cdd8; line-height: 1.7; }',
    'code, pre { font-family: "IBM Plex Mono", monospace; }',
    ".page { max-width: 860px; margin: 0 auto; padding: 40px 24px 120px; }",

    // Hero
    ".hero { text-align: center; padding: 80px 0 60px; }",
    ".hero-badge { display: inline-block; background: rgba(14,165,233,0.12); color: #38bdf8; font-size: 12px; font-weight: 600; padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(14,165,233,0.2); margin-bottom: 20px; letter-spacing: 0.5px; }",
    ".hero-title { font-size: 56px; font-weight: 700; color: #fff; letter-spacing: -1px; }",
    ".hero-subtitle { font-size: 18px; color: #64748b; margin-top: 16px; line-height: 1.8; }",
    ".hero-meta { display: flex; gap: 12px; justify-content: center; margin-top: 28px; flex-wrap: wrap; }",
    ".hero-chip { font-size: 13px; color: #94a3b8; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 16px; }",

    // TOC
    ".toc { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; margin: 40px 0 60px; }",
    ".toc-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 20px; }",
    ".toc-section { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; }",
    ".toc-link { display: block; font-size: 14px; color: #94a3b8; text-decoration: none; padding: 4px 0; transition: color 0.15s; }",
    ".toc-link:hover { color: #38bdf8; }",

    // Part header
    ".part-header { text-align: center; padding: 60px 0 40px; }",
    ".part-label { display: block; font-size: 13px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }",
    ".part-title { display: block; font-size: 32px; font-weight: 700; color: #fff; }",

    // Chapter
    ".chapter { padding: 50px 0 20px; }",
    ".chapter-marker { margin-bottom: 8px; }",
    ".chapter-num { font-size: 12px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; background: rgba(14,165,233,0.1); padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(14,165,233,0.2); }",
    ".chapter-title { font-size: 28px; font-weight: 700; color: #fff; margin-top: 12px; }",
    ".chapter-icon { font-size: 28px; }",
    ".chapter-subtitle { font-size: 15px; color: #64748b; margin-top: 6px; }",

    // Sub heading
    '.sub-heading { font-size: 18px; font-weight: 600; color: #e2e8f0; margin: 28px 0 12px; padding-left: 14px; border-left: 3px solid #38bdf8; }',

    // Narrative
    ".narrative { padding: 16px 0; font-size: 15px; color: #94a3b8; line-height: 1.8; }",
    ".narrative p { margin-bottom: 12px; }",
    ".narrative em { color: #cbd5e1; font-style: italic; }",
    ".narrative strong { color: #e2e8f0; }",
    ".narrative code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #38bdf8; }",

    // Flow diagram
    ".flow-diagram { display: flex; align-items: center; gap: 0; padding: 20px 0; overflow-x: auto; flex-wrap: wrap; }",
    ".flow-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 16px; font-size: 13px; color: #cbd5e1; white-space: nowrap; }",
    ".flow-highlight { background: rgba(14,165,233,0.1); border-color: rgba(14,165,233,0.3); color: #38bdf8; font-weight: 600; }",
    ".flow-arrow { color: #475569; font-size: 18px; padding: 0 6px; }",

    // API step
    ".api-step { position: relative; padding: 0 0 0 32px; margin: 20px 0; }",
    ".step-connector { position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, rgba(14,165,233,0.3), rgba(14,165,233,0.05)); }",
    ".step-dot { position: absolute; left: 3px; top: 8px; width: 12px; height: 12px; border-radius: 50%; background: #0ea5e9; border: 2px solid #0B0F1A; }",
    ".step-content { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px 24px; }",
    ".step-title { font-size: 15px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }",
    ".step-title code { font-size: 14px; color: #e2e8f0; }",
    ".step-when { font-size: 12px; color: #64748b; margin-top: 4px; font-style: italic; }",
    ".step-desc { font-size: 14px; color: #94a3b8; margin-top: 10px; line-height: 1.7; }",
    ".step-desc code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #38bdf8; }",

    // Step sections
    ".step-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; margin-top: 14px; }",
    ".hdr-table { font-size: 12px; border-collapse: collapse; }",
    ".hdr-table td { padding: 3px 12px 3px 0; color: #94a3b8; }",
    ".hdr-table td:first-child { color: #38bdf8; font-family: 'IBM Plex Mono', monospace; }",

    // JSON block
    ".json-block { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 14px 18px; font-size: 12px; line-height: 1.6; color: #a5f3a3; overflow-x: auto; white-space: pre; }",

    // Method badge
    ".method-badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 3px 10px; border-radius: 6px; }",
    ".method-emerald { background: rgba(16,185,129,0.15); color: #34d399; }",
    ".method-sky { background: rgba(14,165,233,0.15); color: #38bdf8; }",
    ".method-amber { background: rgba(245,158,11,0.15); color: #fbbf24; }",
    ".method-violet { background: rgba(139,92,246,0.15); color: #a78bfa; }",
    ".method-rose { background: rgba(244,63,94,0.15); color: #fb7185; }",

    // Tip / Warning
    ".tip-box { background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.15); border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #94a3b8; margin: 16px 0; display: flex; align-items: flex-start; gap: 10px; }",
    ".warning-box { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #94a3b8; margin: 16px 0; display: flex; align-items: flex-start; gap: 10px; }",
    ".tip-icon { font-size: 18px; flex-shrink: 0; }",
    ".tip-box code, .warning-box code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #38bdf8; }",

    // Section divider
    ".section-divider { display: flex; align-items: center; justify-content: center; padding: 40px 0; gap: 12px; }",
    ".divider-line { height: 1px; width: 80px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent); }",
    ".divider-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.1); }",

    // Observations card
    ".obs-card { background: linear-gradient(135deg, rgba(14,165,233,0.06), rgba(139,92,246,0.06)); border: 1px solid rgba(14,165,233,0.15); border-radius: 16px; padding: 32px; margin: 40px 0 20px; }",
    ".obs-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 20px; }",
    ".obs-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px; }",
    ".obs-table th { text-align: left; padding: 10px 16px; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); }",
    ".obs-table td { padding: 10px 16px; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.04); }",
    ".obs-total td { color: #38bdf8; font-weight: 700; border-bottom: none; border-top: 1px solid rgba(14,165,233,0.2); }",
    ".obs-dim { color: #64748b; font-size: 12px; }",
    ".obs-note { font-size: 13px; color: #64748b; line-height: 1.7; margin-top: 12px; }",
    ".obs-note code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #38bdf8; }",
    ".obs-note em { color: #94a3b8; }",

    // Epilogue
    ".epilogue { text-align: center; padding: 60px 0; }",
    ".epilogue-counter { font-size: 48px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; }",
    ".epilogue-title { font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 16px; }",
    ".epilogue-text { font-size: 15px; color: #64748b; max-width: 600px; margin: 0 auto 12px; line-height: 1.8; }",
    ".epilogue-text a { color: #38bdf8; text-decoration: underline; }",
    ".epilogue-stats { display: flex; justify-content: center; gap: 32px; margin: 32px 0; flex-wrap: wrap; }",
    ".epilogue-stat { text-align: center; }",
    ".epilogue-stat-num { display: block; font-size: 36px; font-weight: 700; color: #38bdf8; }",
    ".epilogue-stat-label { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }",

    // Responsiveness
    "@media (max-width: 640px) { .hero-title { font-size: 36px; } .chapter-title { font-size: 22px; } .flow-diagram { gap: 4px; } .flow-box { font-size: 11px; padding: 6px 10px; } .flow-arrow { font-size: 14px; padding: 0 3px; } .sub-heading { font-size: 16px; } }",
  ].join("\n");
}

/* ── Go ─────────────────────────────────────────────────────────────── */

fs.writeFileSync(OUT, buildPage(), "utf8");
console.log("Generated " + OUT + " (" + stepCounter + " API steps documented)");
