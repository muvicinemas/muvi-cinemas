const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "main-backend-microservices", "alpha-muvi-gateway-main", "src");
const OUT_FILE = path.resolve(__dirname, "api.html");
const BASE_URL = "http://localhost:3000/api/v1";

/* ── helpers ────────────────────────────────────────────────────────── */

function walkDir(dir, files) {
  files = files || [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build"].indexOf(entry.name) >= 0) continue;
      walkDir(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractQuotedStrings(text) {
  var results = [];
  var re = /['"`]([^'"`]+)['"`]/g;
  var m;
  while ((m = re.exec(text))) results.push(m[1]);
  return results;
}

function normalizeType(type) {
  if (!type) return "";
  var t = type.trim().replace(/\|.*/g, "").replace(/\[\]/g, "");
  var generic = t.indexOf("<");
  if (generic >= 0) t = t.slice(0, generic);
  return t.trim();
}

/* ── DTO cache & extraction ─────────────────────────────────────────── */

var dtoCache = new Map();

function findDtoClass(dtoName, allFiles) {
  if (dtoCache.has(dtoName)) return dtoCache.get(dtoName);
  var classRe = new RegExp("class\\s+" + dtoName + "\\b");
  for (var i = 0; i < allFiles.length; i++) {
    var content = fs.readFileSync(allFiles[i], "utf8");
    if (classRe.test(content)) {
      var result = { file: allFiles[i], content: content };
      dtoCache.set(dtoName, result);
      return result;
    }
  }
  dtoCache.set(dtoName, null);
  return null;
}

function extractDtoFieldsWithTypes(dtoContent) {
  var fields = [];
  var re = /(?:(?:[ \t]*@[^\n]+\n)+)?[ \t]+(?:readonly\s+)?["']?([A-Za-z0-9_-]+)["']?\??\s*:\s*([^;=\n]+)/g;
  var m;
  while ((m = re.exec(dtoContent))) {
    var block = dtoContent.slice(Math.max(0, m.index - 600), m.index + m[0].length);
    var name = m[1];
    var tsType = m[2].trim();
    fields.push({
      name: name,
      tsType: tsType,
      isOptional: block.indexOf("@IsOptional") >= 0 || m[0].indexOf("?:") >= 0,
      isString:   block.indexOf("@IsString") >= 0 || /:\s*string/.test(m[0]),
      isNumber:   block.indexOf("@IsNumber") >= 0 || block.indexOf("@IsNumberString") >= 0 || /:\s*number/.test(m[0]),
      isBoolean:  block.indexOf("@IsBoolean") >= 0 || /:\s*boolean/.test(m[0]),
      isEmail:    block.indexOf("@IsEmail") >= 0,
      isEnum:     block.indexOf("@IsEnum") >= 0,
      isArray:    block.indexOf("@IsArray") >= 0 || tsType.indexOf("[]") >= 0,
      isDate:     block.indexOf("@IsDate") >= 0 || block.indexOf("@IsDateString") >= 0 || /Date/.test(tsType),
    });
  }
  var seen = {};
  return fields.filter(function (f) {
    if (seen[f.name]) return false;
    seen[f.name] = true;
    return true;
  });
}

function guessSampleValue(field) {
  var n = field.name.toLowerCase();
  if (field.isEmail || n.indexOf("email") >= 0) return "user@example.com";
  if (n.indexOf("phone") >= 0 || n.indexOf("mobile") >= 0) return "+966500000000";
  if (n.indexOf("password") >= 0 || n.indexOf("otp") >= 0 || n === "code") return "123456";
  if (field.isDate || n.indexOf("date") >= 0 || n.indexOf("time") >= 0 || n.indexOf("_at") >= 0) return "2026-01-15T12:00:00.000Z";
  if (n.endsWith("id") || n.indexOf("_id") >= 0 || n === "id") return "01HZYXWVUTS1234567890ABCDE";
  if (field.isBoolean || n.indexOf("is") === 0 || n.indexOf("has") === 0 || n.indexOf("can") === 0 || n.indexOf("enable") >= 0) return true;
  if (field.isNumber || /amount|price|total|fee|count|quantity|qty|limit|offset|page|size|number|num/.test(n)) return 10;
  if (field.isArray) return ["item1", "item2"];
  if (/url|link|image|photo|avatar|logo|icon/.test(n)) return "https://example.com/image.png";
  if (/name|title|label/.test(n)) return "Sample Name";
  if (/description|note|message|text|comment|reason/.test(n)) return "Sample description text";
  if (/lang|language|locale/.test(n)) return "EN";
  if (n.indexOf("platform") >= 0) return "android";
  if (n === "lat" || n === "latitude") return 24.7136;
  if (n === "lng" || n === "lon" || n === "longitude") return 46.6753;
  if (n.indexOf("currency") >= 0) return "SAR";
  if (n.indexOf("country") >= 0) return "SA";
  if (n.indexOf("city") >= 0) return "Riyadh";
  if (n.indexOf("color") >= 0 || n.indexOf("colour") >= 0) return "#4F46E5";
  if (n.indexOf("token") >= 0) return "tok_sample_1234567890";
  if (field.isString) return "string_value";
  return "value";
}

function buildSamplePayload(dtoFields) {
  if (!dtoFields || !dtoFields.length) return null;
  var obj = {};
  for (var i = 0; i < dtoFields.length; i++) obj[dtoFields[i].name] = guessSampleValue(dtoFields[i]);
  return obj;
}

/* ── Controller parser ──────────────────────────────────────────────── */

function parseControllers(allFiles) {
  var endpoints = [];

  for (var fi = 0; fi < allFiles.length; fi++) {
    var file = allFiles[fi];
    var content = fs.readFileSync(file, "utf8");
    if (content.indexOf("@Controller") < 0) continue;

    var ctrlMatch = content.match(/@Controller\(([^)]*)\)/);
    if (!ctrlMatch) continue;

    var prefixes = [];
    var ctrlArg = (ctrlMatch[1] || "").trim();
    if (!ctrlArg) {
      prefixes = [""];
    } else if (ctrlArg.charAt(0) === "[") {
      prefixes = extractQuotedStrings(ctrlArg);
    } else {
      var one = extractQuotedStrings(ctrlArg);
      prefixes = one.length ? [one[0]] : [ctrlArg.replace(/\s/g, "")];
    }

    // Class-level guards
    var classGuards = [];
    var cgRe = /@UseGuards\(([^)]+)\)/g;
    var ctrlIdx = content.indexOf("@Controller");
    var areaBeforeClass = content.slice(Math.max(0, ctrlIdx - 300), ctrlIdx);
    var cgm;
    while ((cgm = cgRe.exec(areaBeforeClass))) {
      classGuards.push.apply(classGuards, cgm[1].split(",").map(function (s) { return s.trim(); }));
    }
    // Also right after @Controller line
    var areaAfterCtrl = content.slice(ctrlIdx, ctrlIdx + 200);
    var cgRe2 = /@UseGuards\(([^)]+)\)/g;
    while ((cgm = cgRe2.exec(areaAfterCtrl))) {
      classGuards.push.apply(classGuards, cgm[1].split(",").map(function (s) { return s.trim(); }));
    }

    var routeRe = /@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g;
    var match;
    while ((match = routeRe.exec(content))) {
      var method = match[1].toUpperCase();
      var arg = (match[2] || "").trim();
      var paths = arg ? extractQuotedStrings(arg) : [""];

      var after = content.slice(match.index, match.index + 1200);

      // Method-level guards
      var methodGuards = classGuards.slice();
      var decoBlock = content.slice(Math.max(0, match.index - 500), match.index);
      var lastBrace = decoBlock.lastIndexOf("}");
      var localArea = lastBrace >= 0 ? decoBlock.slice(lastBrace + 1) : decoBlock;
      var lgRe = /@UseGuards\(([^)]+)\)/g;
      var lgm;
      while ((lgm = lgRe.exec(localArea))) {
        methodGuards.push.apply(methodGuards, lgm[1].split(",").map(function (s) { return s.trim(); }));
      }

      var guardStr = methodGuards.join(" ");
      var requiresAuth = /AuthGuard|JwtAuthGuard/.test(guardStr) && !/OptionalAuth/.test(guardStr);
      var optionalAuth = /OptionalAuth/.test(guardStr);
      var requiresKiosk = /KioskGuard/.test(guardStr);

      // Signature + @Body
      var sigMatch = after.match(/\n\s*(?:@[^\n]*\n\s*)*(?:async\s+)?([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*[:{]/);
      var params = sigMatch ? sigMatch[2] : "";

      var bodyType = "";
      var bodyMatch = params.match(/@Body\([^)]*\)\s*[A-Za-z0-9_]+\s*:\s*([A-Za-z0-9_<>\[\]|]+)/);
      if (bodyMatch) bodyType = normalizeType(bodyMatch[1]);

      // Query params
      var queryParams = [];
      var queryRe = /@Query\(['"]([^'"]+)['"]\)/g;
      var qm;
      while ((qm = queryRe.exec(params))) queryParams.push(qm[1]);
      var queryDtoMatch = params.match(/@Query\(\)\s*[A-Za-z0-9_]+\s*:\s*([A-Za-z0-9_]+)/);
      var queryDtoType = queryDtoMatch ? normalizeType(queryDtoMatch[1]) : "";

      for (var pi = 0; pi < prefixes.length; pi++) {
        var pp = paths.length ? paths : [""];
        for (var ppi = 0; ppi < pp.length; ppi++) {
          var full = [prefixes[pi], pp[ppi]].filter(Boolean).join("/");
          endpoints.push({
            method: method,
            path: full ? "/" + full : "/",
            controllerFile: path.relative(path.resolve(__dirname, ".."), file).replace(/\\/g, "/"),
            bodyType: bodyType,
            requiresAuth: requiresAuth,
            optionalAuth: optionalAuth,
            requiresKiosk: requiresKiosk,
            queryParams: queryParams,
            queryDtoType: queryDtoType,
          });
        }
      }
    }
  }

  return endpoints;
}

/* ── Storybook-style chapter definitions ─────────────────────────────── */

var CHAPTERS = [
  // ══════════ Part I: CMS (Admin Panel) ══════════
  { id: "cms-auth", part: "CMS", ch: 1, icon: "\u{1F510}", title: "Authentication & Profile",
    subtitle: "The admin opens the CMS and logs in.",
    narrative: '<p>The CMS is a React + Vite admin panel. When an admin opens it, the first thing they see is the <strong>login screen</strong>. After signing in with email + password, the app stores a JWT and loads their role &amp; permissions.</p>',
    flow: ["Admin opens CMS", "Login page renders", "POST cms/auth/login *", "Store token + permissions", "Redirect to /app"],
    match: function(p) { return /^cms\/auth/.test(p); } },

  { id: "cms-settings", part: "CMS", ch: 2, icon: "\u{1F4CA}", title: "Dashboard, Settings & Global Config",
    subtitle: "What loads when the admin lands on /app.",
    narrative: '<p>After login the app redirects to <code>/app</code>. The dashboard immediately fetches global settings (checkout timeouts, maintenance mode) and financial data (transactions, Mada card BINs).</p>',
    flow: ["Dashboard mounts", "GET cms/settings *", "GET cms/transactions", "GET cms/cards/mada-card-bins"],
    match: function(p) { return /^cms\/(settings|transactions|cards)/.test(p); } },

  { id: "cms-movies", part: "CMS", ch: 3, icon: "\u{1F3AC}", title: "Movies, Genres, Ratings & Casting",
    subtitle: "The admin navigates to the Movies section.",
    narrative: '<p>Movies originate from <strong>Vista</strong> (the cinema management backend) and are synced into Muvi. The admin can sync, edit translations, assign genres/cast, and publish/unpublish films.</p>',
    flow: ["Vista System", "POST cms/films/sync *", "Muvi DB", "GET cms/films", "Movies List Page"],
    match: function(p) { return /^cms\/(films|genres|rates|people|specialties|bookmarks)/.test(p); } },

  { id: "cms-cinemas", part: "CMS", ch: 4, icon: "\u{1F3E2}", title: "Cinemas, Cities & Experiences",
    subtitle: "Managing cinema locations, city ordering, and screen experiences.",
    narrative: '<p>Cinemas are organized by city. The admin manages cities, then within each city manages cinemas and their display order. Experiences like <strong>IMAX, VIP, 4DX</strong> are managed separately and linked to specific screens.</p>',
    flow: ["GET cms/cities", "Select a city", "GET cms/cinemas *", "Edit cinema details", "Manage experiences"],
    match: function(p) { return /^cms\/(cinemas|cities|experiences|collectors)/.test(p); } },

  { id: "cms-showtimes", part: "CMS", ch: 5, icon: "\u{1F4C5}", title: "Showtimes & Sessions",
    subtitle: "Showtimes are synced from Vista \u2014 each links a movie to a cinema screen.",
    narrative: '<p>Showtimes (sessions) come from Vista. Each session links a specific movie to a cinema screen at a date/time. Admins can view the full schedule and trigger manual syncs.</p>',
    flow: ["Admin clicks Sync", "POST cms/sessions/sync *", "Vista \u2192 Muvi DB", "GET cms/sessions", "Showtimes table"],
    match: function(p) { return /^cms\/sessions/.test(p); } },

  { id: "cms-promos", part: "CMS", ch: 6, icon: "\u{1F381}", title: "Banners, Offers & Offer Rules",
    subtitle: "The admin sets up homepage banners and promotional offers.",
    narrative: '<p>Banners appear in the homepage carousel. Offers can target specific movies, cinemas, dates, and user segments. Offer rules are reusable conditions (e.g. \u201cweekend only\u201d, \u201cmin 2 tickets\u201d).</p>',
    flow: ["Create banner", "Create offer rule", "Create offer *", "Attach rules", "Publish"],
    match: function(p) { return /^cms\/(banners|offers|offer-rules|offer-logs)/.test(p); } },

  { id: "cms-users", part: "CMS", ch: 7, icon: "\u{1F465}", title: "Users, Roles & Permissions",
    subtitle: "The admin manages team access \u2014 who can see and do what.",
    narrative: '<p>Not every CMS user can see everything. The RBAC system has <strong>Permissions</strong> (resource + action pairs) \u2192 attached to <strong>Roles</strong> \u2192 assigned to <strong>Users</strong>. Each route checks permissions.</p>',
    flow: ["GET cms/permissions", "Create Role *", "Assign permissions", "Create User", "Assign role"],
    match: function(p) { return /^cms\/(users|roles|permissions|contact-us)/.test(p); } },

  { id: "cms-orders", part: "CMS", ch: 8, icon: "\u{1F6D2}", title: "Customers, Orders & Refunds",
    subtitle: "The admin monitors customer bookings, processes refunds, and manages customer accounts.",
    narrative: '<p>This is the ops team\u2019s daily view. They can look up customers (registered + guest), view all ticket orders, resend confirmation emails, and process refunds when needed.</p>',
    flow: ["GET cms/users/customers", "GET cms/orders *", "View order detail", "Process refund", "Resend email"],
    match: function(p) { return /^cms\/(orders|guest-users|cancellation|private-bookings|refund)/.test(p); } },

  { id: "cms-fb", part: "CMS", ch: 9, icon: "\u{1F37F}", title: "Food & Beverages, Bank Accounts",
    subtitle: "The admin configures the F&B menu and payment settlement accounts.",
    narrative: '<p>The food menu has tabs, items, modifier groups, and up-sell items. Bank accounts are used for payment settlements with the payment gateway.</p>',
    flow: ["Configure menu tabs", "Add menu items *", "Set modifiers", "Add up-sells", "Manage bank accounts"],
    match: function(p) { return /^cms\/(food|fb|bank)/.test(p); } },

  { id: "cms-notif", part: "CMS", ch: 10, icon: "\u{1F514}", title: "Notifications & Push Templates",
    subtitle: "The admin creates and sends push notifications to users.",
    narrative: '<p>Notification templates can target all users, specific movie watchers, or frequent cinema visitors. They can be scheduled or sent immediately.</p>',
    flow: ["Create template", "Set target audience *", "Choose schedule", "Publish/Send"],
    match: function(p) { return /^cms\/(notification|push)/.test(p); } },

  { id: "cms-pages", part: "CMS", ch: 11, icon: "\u{1F4C4}", title: "SEO, Dynamic Pages & Onboarding",
    subtitle: "The admin manages website content, SEO metadata, and mobile app onboarding slides.",
    narrative: '<p>SEO metadata controls how pages appear in Google. Dynamic pages hold content for About Us, Privacy Policy, T&amp;C. Onboarding slides are shown to first-time mobile app users.</p>',
    flow: ["Edit page SEO meta", "Edit dynamic pages *", "Manage onboarding slides", "Voucher redemption steps"],
    match: function(p) { return /^cms\/(page-meta|dynamic-pages|onboarding|voucher-redemption)/.test(p); } },

  { id: "cms-misc", part: "CMS", ch: 12, icon: "\u2699\uFE0F", title: "Logs, Files, Kiosks & Misc",
    subtitle: "System tools: audit trails, file uploads, kiosk management, and avatars.",
    narrative: '<p>Every CMS action is logged in the audit trail. File uploads go to CDN. Kiosk terminals are registered and configured per cinema. Avatars are the profile pictures users can choose from.</p>',
    flow: ["View audit logs", "Upload files \u2192 CDN *", "Manage kiosks", "Manage avatars"],
    match: function(p) { return /^cms\//.test(p); } },

  // ══════════ Kiosk ══════════ (checked before Website catch-all)
  { id: "kiosk", part: "Kiosk", ch: 13, icon: "\u{1F5A5}\uFE0F", title: "Kiosk Endpoints",
    subtitle: "A customer walks up to a self-service kiosk in the cinema lobby.",
    narrative: '<p>Kiosks are standalone terminals in cinema lobbies. They authenticate with a kiosk key + ID (not user tokens). Customers can browse movies, select seats, add food, and pay \u2014 all on the kiosk screen.</p>',
    flow: ["Kiosk boots", "Auth via kiosk key *", "Browse showtimes", "Select seats", "Order food", "Pay at kiosk"],
    match: function(p) { return /^(kiosks?|fb\/orders)/.test(p); } },

  // ══════════ Part II: Website (Customer Journey) ══════════
  { id: "web-boots", part: "Website", ch: 14, icon: "\u{1F310}", title: "Website Boots: Settings, Cities & Banners",
    subtitle: "A customer opens muvicinemas.com \u2014 these APIs fire immediately, no login needed.",
    narrative: '<p>The moment the page loads, the Next.js app fetches platform settings (is maintenance mode on?), the list of cities (for the city selector), banners (for the hero carousel), and SEO metadata. <strong>None of these require authentication.</strong></p>',
    noAuth: true,
    flow: ["User opens website", "GET settings *", "GET cities", "GET banners", "GET page-meta-data", "Homepage renders!"],
    match: function(p) { return /^(settings|cities|banners|communication-languages|page-meta-data)(\/|$)/.test(p); } },

  { id: "web-auth", part: "Website", ch: 15, icon: "\u{1F4F1}", title: "Sign Up, Login & OTP",
    subtitle: "The customer clicks \u201cBook Now\u201d and is asked to sign in with their phone number.",
    narrative: '<p>Unlike the CMS (email+password), the website uses <strong>phone number + OTP</strong>. The user enters their phone, receives an SMS code, and verifies it. New users complete a profile. Email verification and phone change flows are also here.</p>',
    flow: ["User clicks Book", "Login modal opens", "Enter phone *", "POST auth/send-otp", "Enter OTP", "POST auth/verify-otp *", "Authenticated!"],
    match: function(p) { return /^auth/.test(p) || /^guest-users\/(phone-number|verify)$/.test(p); } },

  { id: "web-movies", part: "Website", ch: 16, icon: "\u{1F3A5}", title: "Browsing Movies",
    subtitle: "The customer scrolls through Now Showing and Coming Soon on the homepage.",
    narrative: '<p>The homepage shows movies grouped by bookmark (Now Showing, Coming Soon, Advance Booking). Clicking a movie poster opens the detail page with trailer, cast, description, and a list of cinemas showing it. <strong>All public \u2014 no login needed.</strong></p>',
    noAuth: true,
    flow: ["Homepage", "GET films (Now Showing) *", "Click movie poster", "GET films/:slug", "Movie detail page", "GET films/:id/cinemas"],
    match: function(p) { return /^films/.test(p); } },

  { id: "web-finder", part: "Website", ch: 17, icon: "\u{1F50D}", title: "Movie Finder & Search",
    subtitle: "The customer opens the Movie Finder to search across dates, cinemas, and experiences.",
    narrative: '<p>Movie Finder is a powerful multi-filter tool. It loads available dates, then lets the user filter by movie, cinema, and experience (IMAX, VIP). Results show matching showtimes grouped by movie. There\u2019s also a text search bar with recent search history. <strong>All public.</strong></p>',
    noAuth: true,
    flow: ["Open Movie Finder", "GET .../dates *", "GET .../filters/films", "GET .../filters/cinemas", "Select filters", "GET film-finder *", "Results!"],
    match: function(p) { return /^(film-finder|recent-searches)/.test(p); } },

  { id: "web-cinemas", part: "Website", ch: 18, icon: "\u{1F3DF}\uFE0F", title: "Cinemas & Experiences",
    subtitle: "The customer browses the cinema directory, views showtimes at a specific location.",
    narrative: '<p>The Cinemas page lists all locations with their experiences. Clicking a cinema shows its detail page \u2014 description, photos, map, and today\u2019s showtimes. Experiences (IMAX, VIP, 4DX) have their own pages too. <strong>All public.</strong></p>',
    noAuth: true,
    flow: ["GET cinemas *", "Click cinema", "GET cinemas/:slug", "GET showtimes", "Select a showtime"],
    match: function(p) { return /^(cinemas|showtimes|experiences)/.test(p); } },

  { id: "web-booking", part: "Website", ch: 19, icon: "\u{1F3AB}", title: "Booking, Orders & Cancellations",
    subtitle: "The customer selects a showtime \u2192 picks seats \u2192 adds food \u2192 books \u2192 and can later view, share, or cancel tickets.",
    narrative: '<p>This is the money flow. After selecting a showtime, the seat map loads. The customer picks seats, optionally adds food, and the system creates a pending order with a <strong>10-minute checkout timeout</strong>. After payment, tickets appear in <strong>My Bookings</strong> with QR codes. Customers can share tickets, set reminders, and cancel (with time-based refund policies).</p>',
    flow: ["Select showtime", "GET .../seats *", "Select seats", "POST orders *", "Add food?", "Apply offer?", "Pay", "My Bookings", "Cancel?"],
    match: function(p) { return /^(orders|food-menu|guest-users\/orders|cancellation-reasons)/.test(p); } },

  { id: "web-payment", part: "Website", ch: 20, icon: "\u{1F4B3}", title: "Payment & Credit Cards",
    subtitle: "The customer pays for their booking \u2014 card management, Apple Pay, STC Pay.",
    narrative: '<p>Users can save multiple cards (VISA, Mada, Mastercard). The system detects Mada cards via BIN check for special KSA processing. Payment supports 3DS verification, Apple Pay, and STC Pay.</p>',
    flow: ["GET cards *", "Choose card", "POST orders/:id/pay *", "3DS redirect?", "CONFIRMED!"],
    match: function(p) { return /^(cards|stc-pay|guest-users\/cards)/.test(p); } },

  { id: "web-wallet", part: "Website", ch: 21, icon: "\u{1F4B0}", title: "Wallet & Top-ups",
    subtitle: "The customer manages their digital wallet \u2014 refunds land here, and they can top up.",
    narrative: '<p>The wallet stores refund credits and manual top-ups. Users can view balance, transaction history, and add money using saved cards. Wallet credits can expire.</p>',
    flow: ["GET wallet/balance *", "View transactions", "POST top-ups", "POST top-ups/:id/pay *", "Balance updated"],
    match: function(p) { return /^(wallet|top-ups|transactions)/.test(p); } },

  { id: "web-offers", part: "Website", ch: 22, icon: "\u{1F381}", title: "Offers & Vouchers",
    subtitle: "The customer browses active promotions and applies voucher codes at checkout.",
    narrative: '<p>The Offers page lists all active promotions. Each offer has terms, applicable movies/cinemas, and available showtimes. Voucher codes can be entered at checkout for additional discounts.</p>',
    flow: ["GET offers *", "View offer detail", "See applicable showtimes", "Apply voucher at checkout"],
    match: function(p) { return /^offers/.test(p); } },

  { id: "web-profile", part: "Website", ch: 23, icon: "\u{1F464}", title: "Profile, Notifications & Everything Else",
    subtitle: "The customer manages their profile, reads notifications, and uploads files.",
    narrative: '<p>Users can update their name, avatar, preferred city, and language. Push notifications show movie alerts, booking confirmations, and promotional offers. The notification bell badge shows unread count.</p>',
    flow: ["PUT auth/profile *", "PATCH users/cities", "GET notifications", "Mark as read", "Upload avatar"],
    match: function(p) { return /^(users|notifications|avatars)/.test(p); } },

  { id: "web-misc", part: "Website", ch: 24, icon: "\u{1F4CB}", title: "Static Pages, Contact & Misc",
    subtitle: "About Us, Privacy Policy, Contact form, private booking requests \u2014 the remaining pages.",
    narrative: '<p>These are the static content pages (rendered from CMS-managed content), the Contact Us form, private/corporate booking requests, and file upload utilities.</p>',
    flow: ["GET dynamic-pages/:type *", "GET voucher-redemption-steps", "POST contact-us", "POST private-bookings"],
    match: function(p) { return true; } },
];

function assignChapter(ep) {
  var p = ep.path.replace(/^\//, "");
  for (var i = 0; i < CHAPTERS.length; i++) {
    if (CHAPTERS[i].match(p)) return CHAPTERS[i];
  }
  return CHAPTERS[CHAPTERS.length - 1];
}

function subgroupKey(path) {
  var parts = path.replace(/^\//, "").split("/");
  if (parts[0] === "cms" && parts.length > 1) return parts[1];
  return parts[0] || "root";
}

function groupByChapter(endpoints) {
  var chapterMap = {};
  for (var i = 0; i < CHAPTERS.length; i++) {
    chapterMap[CHAPTERS[i].id] = { chapter: CHAPTERS[i], subgroups: {} };
  }
  for (var j = 0; j < endpoints.length; j++) {
    var ep = endpoints[j];
    var ch = assignChapter(ep);
    var key = subgroupKey(ep.path);
    if (!chapterMap[ch.id].subgroups[key]) chapterMap[ch.id].subgroups[key] = [];
    chapterMap[ch.id].subgroups[key].push(ep);
  }
  var result = [];
  for (var k = 0; k < CHAPTERS.length; k++) {
    var entry = chapterMap[CHAPTERS[k].id];
    if (Object.keys(entry.subgroups).length > 0) result.push(entry);
  }
  return result;
}

/* ── HTML escaper ───────────────────────────────────────────────────── */

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── HTML builder ───────────────────────────────────────────────────── */

function buildHtml(endpoints, allFiles) {
  var chapters = groupByChapter(endpoints);
  var cardCounter = 0;

  var methodColors = {
    GET:    { badge: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" },
    POST:   { badge: "bg-sky-500/20 text-sky-400 ring-sky-500/30" },
    PUT:    { badge: "bg-amber-500/20 text-amber-400 ring-amber-500/30" },
    PATCH:  { badge: "bg-violet-500/20 text-violet-400 ring-violet-500/30" },
    DELETE: { badge: "bg-rose-500/20 text-rose-400 ring-rose-500/30" },
  };

  function renderEndpointCard(ep) {
    cardCounter++;
    var uid = "ep-" + cardCounter;
    var mc = methodColors[ep.method] || { badge: "bg-slate-500/20 text-slate-400 ring-slate-500/30" };

    // ── DTO fields & sample payload
    var dtoFields = [];
    var dtoName = ep.bodyType || "";
    if (dtoName) {
      var dto = findDtoClass(dtoName, allFiles);
      if (dto) dtoFields = extractDtoFieldsWithTypes(dto.content);
    }

    var supportsBody = ep.method !== "GET" && ep.method !== "DELETE";
    var sampleObj = supportsBody ? (buildSamplePayload(dtoFields) || {}) : null;
    var sampleJson = supportsBody ? JSON.stringify(sampleObj, null, 2) : "";

    // ── Query fields
    var queryFields = [];
    if (ep.queryDtoType) {
      var qDto = findDtoClass(ep.queryDtoType, allFiles);
      if (qDto) queryFields = extractDtoFieldsWithTypes(qDto.content);
    }

    // ── Headers
    var headers = [];
    headers.push({ name: "Accept", value: "application/json", required: true });
    headers.push({ name: "accept-language", value: "EN | AR", required: true });
    headers.push({ name: "x-device-platform", value: "android | ios | web | kiosk", required: false });
    if (supportsBody) {
      headers.push({ name: "Content-Type", value: "application/json", required: true });
    }
    if (ep.requiresAuth) {
      headers.push({ name: "Authorization", value: "Bearer <token>", required: true });
    } else if (ep.optionalAuth) {
      headers.push({ name: "Authorization", value: "Bearer <token>", required: false });
    }
    if (ep.requiresKiosk) {
      headers.push({ name: "x-kiosk-id", value: "kiosk_01HZYX...", required: true });
      headers.push({ name: "x-kiosk-key", value: "kiosk_key_val", required: true });
    }

    // ── Auth badges
    var badges = "";
    if (ep.requiresAuth) {
      badges += ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25">AUTH</span>';
    } else if (ep.optionalAuth) {
      badges += ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-500/15 text-slate-400 ring-1 ring-inset ring-slate-400/25">OPTIONAL AUTH</span>';
    }
    if (ep.requiresKiosk) {
      badges += ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-500/15 text-violet-400 ring-1 ring-inset ring-violet-500/25">KIOSK</span>';
    }

    // ── Curl
    var curlParts = ["$ curl -X " + ep.method + " " + BASE_URL + ep.path + " \\"];
    for (var hi = 0; hi < headers.length; hi++) {
      var trailer = (hi === headers.length - 1 && !supportsBody) ? "" : " \\";
      curlParts.push('  -H "' + headers[hi].name + ": " + headers[hi].value + '"' + trailer);
    }
    if (supportsBody) {
      var bodyForCurl = (sampleJson || "{}").split("\n").join("\n      ");
      curlParts.push("  -d '" + bodyForCurl + "'");
    }
    var curlStr = curlParts.join("\n");

    // ── Headers table
    var headerRows = "";
    for (var hri = 0; hri < headers.length; hri++) {
      var h = headers[hri];
      var reqBadge = h.required
        ? '<span class="text-[10px] font-bold text-rose-400 uppercase">required</span>'
        : '<span class="text-[10px] font-semibold text-slate-600 uppercase">optional</span>';
      headerRows += '<tr class="border-b border-white/[0.04]">'
        + '<td class="py-2.5 pr-4 font-mono text-xs text-sky-400">' + esc(h.name) + "</td>"
        + '<td class="py-2.5 pr-4 font-mono text-xs text-slate-500">' + esc(h.value) + "</td>"
        + '<td class="py-2.5 text-xs">' + reqBadge + "</td>"
        + "</tr>\n";
    }

    // ── Arguments (body fields)
    var argsHtml = "";
    if (supportsBody && dtoFields.length > 0) {
      var rows = "";
      for (var ai = 0; ai < dtoFields.length; ai++) {
        var f = dtoFields[ai];
        var rl = f.isOptional
          ? '<span class="text-[10px] font-semibold text-slate-600 uppercase">optional</span>'
          : '<span class="text-[10px] font-bold text-rose-400 uppercase">required</span>';
        rows += '<tr class="border-b border-white/[0.04]">'
          + '<td class="py-2.5 pr-4 font-mono text-xs text-sky-400">' + esc(f.name) + "</td>"
          + '<td class="py-2.5 pr-4 text-xs text-slate-500">' + esc(f.tsType) + "</td>"
          + '<td class="py-2.5 text-xs">' + rl + "</td>"
          + "</tr>\n";
      }
      argsHtml = '<div class="mt-6">'
        + '<div class="text-[11px] uppercase tracking-wider text-slate-400 mb-3 font-semibold">Arguments</div>'
        + '<table class="w-full">' + rows + "</table>"
        + "</div>";
    } else if (supportsBody && dtoName) {
      argsHtml = '<div class="mt-6">'
        + '<div class="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Request Body</div>'
        + '<div class="text-xs text-slate-600">DTO: <span class="text-slate-400">' + esc(dtoName) + "</span></div>"
        + "</div>";
    }

    // ── Query params
    var queryHtml = "";
    if (ep.queryParams.length > 0 || queryFields.length > 0) {
      var qRows = "";
      if (queryFields.length > 0) {
        for (var qi = 0; qi < queryFields.length; qi++) {
          var qf = queryFields[qi];
          var qrl = qf.isOptional
            ? '<span class="text-[10px] font-semibold text-slate-600 uppercase">optional</span>'
            : '<span class="text-[10px] font-bold text-rose-400 uppercase">required</span>';
          qRows += '<tr class="border-b border-white/[0.04]">'
            + '<td class="py-2.5 pr-4 font-mono text-xs text-sky-400">' + esc(qf.name) + "</td>"
            + '<td class="py-2.5 pr-4 text-xs text-slate-500">' + esc(qf.tsType) + "</td>"
            + '<td class="py-2.5 text-xs">' + qrl + "</td>"
            + "</tr>\n";
        }
      } else {
        for (var qpi = 0; qpi < ep.queryParams.length; qpi++) {
          qRows += '<tr class="border-b border-white/[0.04]">'
            + '<td class="py-2.5 pr-4 font-mono text-xs text-sky-400">' + esc(ep.queryParams[qpi]) + "</td>"
            + '<td class="py-2.5 text-xs text-slate-500">query param</td>'
            + "</tr>\n";
        }
      }
      queryHtml = '<div class="mt-6">'
        + '<div class="text-[11px] uppercase tracking-wider text-slate-400 mb-3 font-semibold">Query Parameters</div>'
        + '<table class="w-full">' + qRows + "</table>"
        + "</div>";
    }

    // ── Textarea rows
    var txRows = Math.min(Math.max(4, (sampleJson.split("\n").length || 1) + 1), 16);

    // ── Card HTML
    var html = '';
    html += '<article class="endpoint-card rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur mb-6 overflow-hidden" id="' + uid + '">\n';

    // Top bar
    html += '  <div class="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">\n';
    html += '    <span class="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ring-inset ' + mc.badge + '">' + ep.method + "</span>\n";
    html += '    <code class="text-[15px] text-white font-semibold">' + esc(ep.path) + "</code>\n";
    html += "    " + badges + "\n";
    html += '    <span class="ml-auto text-[11px] text-slate-600 hidden xl:inline">' + esc(ep.controllerFile) + "</span>\n";
    html += "  </div>\n";

    // Two columns
    html += '  <div class="grid lg:grid-cols-2">\n';

    // LEFT column: Headers + Args + Query
    html += '    <div class="p-6 border-b lg:border-b-0 lg:border-r border-white/[0.06]">\n';
    html += '      <div class="text-[11px] uppercase tracking-wider text-slate-400 mb-3 font-semibold">Headers</div>\n';
    html += '      <table class="w-full">\n' + headerRows + "      </table>\n";
    html += "      " + argsHtml + "\n";
    html += "      " + queryHtml + "\n";
    html += "    </div>\n";

    // RIGHT column: curl + body editor + Try + Response
    html += '    <div class="p-6 bg-[#080C15]">\n';

    // Curl
    html += '      <div class="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Example Request</div>\n';
    html += '      <pre class="text-[11px] leading-[1.6] overflow-x-auto rounded-lg bg-black/50 p-4 ring-1 ring-inset ring-white/[0.04] text-slate-300 mb-5">' + esc(curlStr) + "</pre>\n";

    // Editable body
    if (supportsBody) {
      html += '      <div class="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Request Body <span class="normal-case text-slate-600">(editable JSON)</span></div>\n';
      html += '      <textarea class="req-body w-full rounded-lg bg-black/50 p-4 text-[11px] leading-[1.6] text-emerald-300 ring-1 ring-inset ring-white/[0.04] focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-y font-mono" rows="' + txRows + '" spellcheck="false" data-uid="' + uid + '">' + esc(sampleJson || "{}") + "</textarea>\n";
    }

    // Try button
    html += '      <div class="flex items-center gap-3 mt-4 mb-5">\n';
    html += '        <button type="button" class="try-btn rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 px-6 py-2 text-xs font-bold text-white shadow-sm shadow-sky-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none"';
    html += ' data-uid="' + uid + '" data-method="' + ep.method + '" data-path="' + esc(ep.path) + '" data-has-body="' + (supportsBody ? "1" : "0") + '">\n';
    html += '          <span class="btn-label">Try it &#8594;</span>\n';
    html += "        </button>\n";
    html += '        <span class="status-label text-xs text-slate-600" data-uid="' + uid + '"></span>\n';
    html += "      </div>\n";

    // Response
    html += '      <div class="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Response</div>\n';
    html += '      <pre class="resp-box text-[11px] leading-[1.6] overflow-auto rounded-lg bg-black/50 p-4 ring-1 ring-inset ring-white/[0.04] text-slate-600 min-h-[60px] max-h-[500px]" data-uid="' + uid + '">Click &ldquo;Try it &rarr;&rdquo; to send a live request.</pre>\n';

    html += "    </div>\n"; // end right col
    html += "  </div>\n";   // end grid
    html += "</article>\n";

    return html;
  }

  // ── Flow diagram renderer (matches storybook style)
  function renderFlow(steps) {
    if (!steps || !steps.length) return '';
    var html = '<div class="flex flex-wrap items-center gap-2 my-6">';
    for (var i = 0; i < steps.length; i++) {
      if (i > 0) html += '<svg class="w-3.5 h-3.5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>';
      var isHighlight = steps[i].indexOf(' *') >= 0;
      var label = steps[i].replace(' *', '');
      var cls = isHighlight
        ? 'rounded-lg bg-sky-500/15 text-sky-400 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-sky-500/25'
        : 'rounded-lg bg-white/[0.04] text-slate-500 px-3 py-1.5 text-xs ring-1 ring-inset ring-white/[0.06]';
      html += '<div class="' + cls + '">' + esc(label) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderChapter(entry) {
    var ch = entry.chapter;
    var subgroups = entry.subgroups;
    var keys = Object.keys(subgroups).sort();
    var total = 0;
    var sections = "";
    for (var ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      total += subgroups[key].length;
      var cards = "";
      for (var ci = 0; ci < subgroups[key].length; ci++) cards += renderEndpointCard(subgroups[key][ci]);
      sections += '<section class="mb-12" id="' + ch.id + "-" + key + '">\n'
        + '  <div class="flex items-center justify-between mb-5">\n'
        + '    <div><h3 class="text-xl font-semibold text-white">' + esc(key) + "</h3>\n"
        + '    <p class="text-sm text-slate-600">' + subgroups[key].length + " endpoints</p></div>\n"
        + "  </div>\n"
        + cards
        + "</section>\n";
    }

    // Auth info
    var authCount = 0;
    var publicCount = 0;
    for (var ai = 0; ai < keys.length; ai++) {
      for (var aj = 0; aj < subgroups[keys[ai]].length; aj++) {
        if (subgroups[keys[ai]][aj].requiresAuth) authCount++;
        else publicCount++;
      }
    }
    var authBadge = '';
    if (ch.noAuth || (publicCount > 0 && authCount === 0)) {
      authBadge = ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">NO AUTH</span>';
    } else if (publicCount > 0 && authCount > 0) {
      authBadge = ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25">' + publicCount + ' public / ' + authCount + ' auth</span>';
    } else {
      authBadge = ' <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25">AUTH</span>';
    }

    // Chapter number label
    var chNumHtml = (ch.ch != null) ? '<span class="text-[11px] font-bold uppercase tracking-[2px] text-sky-400/60">Chapter ' + ch.ch + '</span>\n' : '';

    // Narrative block
    var narrativeHtml = '';
    if (ch.narrative) {
      narrativeHtml = '<div class="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 mb-2 text-sm text-slate-400 leading-relaxed">' + ch.narrative + '</div>\n';
    }

    // Flow diagram
    var flowHtml = ch.flow ? renderFlow(ch.flow) : '';

    return '<section id="' + ch.id + '" class="mb-16">\n'
      + chNumHtml
      + '  <div class="flex flex-wrap items-center gap-3 mb-2">\n'
      + '    <span class="text-2xl">' + ch.icon + '</span>\n'
      + '    <h2 class="text-3xl font-bold text-white">' + esc(ch.title) + '</h2>\n'
      + authBadge + '\n'
      + '    <span class="ml-auto text-sm text-slate-600">' + total + ' endpoints</span>\n'
      + '  </div>\n'
      + (ch.subtitle ? '  <p class="text-sm text-slate-500 mb-4">' + esc(ch.subtitle) + '</p>\n' : '')
      + narrativeHtml
      + flowHtml
      + sections
      + '</section>\n';
  }

  // ── Sidebar: storybook-style chapter nav
  function chapterSubNav(entry) {
    var ch = entry.chapter;
    var subgroups = entry.subgroups;
    var keys = Object.keys(subgroups).sort();
    var out = '';
    for (var i = 0; i < keys.length; i++) {
      out += '<a href="#' + ch.id + '-' + keys[i] + '" class="block pl-8 py-0.5 text-[11px] text-slate-600 hover:text-slate-300 transition-colors truncate">' + esc(keys[i]) + ' (' + subgroups[keys[i]].length + ')</a>\n';
    }
    return out;
  }

  // Build sidebar nav grouped by Part
  var sidebarNav = '';
  sidebarNav += '<a href="#overview" class="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"><span>Overview</span></a>\n';
  sidebarNav += '<a href="#authenticate" class="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"><span>\u{1F511} Authenticate</span></a>\n';

  var currentPart = '';
  for (var ci = 0; ci < chapters.length; ci++) {
    var entry = chapters[ci];
    var ch = entry.chapter;
    // Part header
    if (ch.part !== currentPart) {
      currentPart = ch.part;
      var partLabel = ch.part === 'CMS' ? 'CMS (Admin Panel)' : ch.part === 'Website' ? 'Website (Customer)' : ch.part;
      sidebarNav += '<div class="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">' + esc(partLabel) + '</div>\n';
    }
    // Chapter count
    var chTotal = 0;
    var chKeys = Object.keys(entry.subgroups);
    for (var ck = 0; ck < chKeys.length; ck++) chTotal += entry.subgroups[chKeys[ck]].length;
    // Chapter link
    var chLabel = (ch.ch != null) ? ch.ch + '. ' : '';
    var noAuthDot = ch.noAuth ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> ' : '';
    sidebarNav += '<a href="#' + ch.id + '" class="flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"><span>' + noAuthDot + ch.icon + ' ' + chLabel + esc(ch.title) + '</span><span class="text-[10px] text-slate-600">' + chTotal + '</span></a>\n';
    // Sub-group links
    if (chKeys.length > 1) {
      sidebarNav += '<div class="mb-0.5">' + chapterSubNav(entry) + '</div>\n';
    }
  }

  // ── Script block
  // Written as plain string (no template literals) to avoid Node interpolation bugs
  var scriptBlock = [
    "<script>",
    "function switchAuthTab(tab) {",
    "  var panels = document.querySelectorAll('.auth-panel');",
    "  for (var i = 0; i < panels.length; i++) panels[i].classList.add('hidden');",
    "  var tabs = document.querySelectorAll('.auth-tab');",
    "  for (var j = 0; j < tabs.length; j++) {",
    "    tabs[j].className = 'auth-tab rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-white/5 text-slate-500 ring-1 ring-inset ring-white/10 hover:text-slate-300';",
    "  }",
    "  var panel = document.getElementById('panel-' + tab);",
    "  var btn   = document.getElementById('tab-' + tab);",
    "  if (panel) panel.classList.remove('hidden');",
    "  if (btn) {",
    "    if (tab === 'cms') btn.className = 'auth-tab active rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-emerald-500/20 text-emerald-400 ring-1 ring-inset ring-emerald-500/30';",
    "    else btn.className = 'auth-tab active rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-sky-500/20 text-sky-400 ring-1 ring-inset ring-sky-500/30';",
    "  }",
    "}",
    "(function () {",
    "  var baseUrlEl  = document.getElementById('baseUrl');",
    "  var authEl     = document.getElementById('authHeader');",
    "  var langEl     = document.getElementById('langHeader');",
    "  var platformEl = document.getElementById('platformHeader');",
    "",
    "  function getVal(el, fb) { return (el && el.value || '').trim() || fb; }",
    "",
    "  function fmtResponse(res, bodyText) {",
    "    var hdr = [];",
    "    try { res.headers.forEach(function(v,k){ hdr.push(k + ': ' + v); }); } catch(_){}",
    "    var pretty = bodyText || '(empty body)';",
    "    var ct = (res.headers.get('content-type') || '').toLowerCase();",
    "    if (ct.indexOf('json') !== -1) {",
    "      try { pretty = JSON.stringify(JSON.parse(bodyText), null, 2); } catch(_){}",
    "    }",
    "    return 'HTTP ' + res.status + ' ' + res.statusText + '\\n'",
    "      + (hdr.length ? hdr.join('\\n') : '') + '\\n\\n'",
    "      + pretty;",
    "  }",
    "",
    "  function tryIt(btn) {",
    "    var uid      = btn.getAttribute('data-uid');",
    "    var method   = btn.getAttribute('data-method');",
    "    var pathStr  = btn.getAttribute('data-path');",
    "    var hasBody  = btn.getAttribute('data-has-body') === '1';",
    "",
    "    var respBox  = document.querySelector('.resp-box[data-uid=\"' + uid + '\"]');",
    "    var bodyEl   = document.querySelector('.req-body[data-uid=\"' + uid + '\"]');",
    "    var statusEl = document.querySelector('.status-label[data-uid=\"' + uid + '\"]');",
    "",
    "    if (!respBox) { console.error('resp-box not found for ' + uid); return; }",
    "",
    "    var base = getVal(baseUrlEl, '" + BASE_URL + "').replace(/\\/+$/, '');",
    "    var url  = base + pathStr;",
    "",
    "    var hdrs = {",
    "      'Accept':            'application/json',",
    "      'accept-language':   getVal(langEl, 'EN'),",
    "      'x-device-platform': getVal(platformEl, 'android')",
    "    };",
    "    var authValue = getVal(authEl, '');",
    "    if (authValue) hdrs['Authorization'] = authValue;",
    "    if (hasBody)   hdrs['Content-Type']  = 'application/json';",
    "",
    "    var body = undefined;",
    "    if (hasBody) {",
    "      var raw = (bodyEl ? bodyEl.value : '').trim() || '{}';",
    "      try { body = JSON.stringify(JSON.parse(raw)); }",
    "      catch (e) {",
    "        respBox.textContent = 'Invalid JSON in request body:\\n\\n' + (e.message || e);",
    "        respBox.className = respBox.className.replace(/text-slate-600|text-emerald-400/g, '') + ' text-rose-400';",
    "        return;",
    "      }",
    "    }",
    "",
    "    btn.disabled = true;",
    "    btn.querySelector('.btn-label').textContent = 'Sending\\u2026';",
    "    if (statusEl) statusEl.textContent = '';",
    "    respBox.textContent  = 'Loading\\u2026';",
    "    respBox.className = respBox.className.replace(/text-emerald-400|text-rose-400/g, '') + ' text-slate-600';",
    "",
    "    var t0 = performance.now();",
    "",
    "    fetch(url, { method: method, headers: hdrs, body: body })",
    "      .then(function (res) {",
    "        return res.text().then(function (txt) {",
    "          var ms = Math.round(performance.now() - t0);",
    "          var ok = res.status >= 200 && res.status < 300;",
    "          respBox.textContent = fmtResponse(res, txt);",
    "          respBox.className = respBox.className.replace(/text-slate-600|text-rose-400|text-emerald-400/g, '');",
    "          respBox.className += ok ? ' text-emerald-400' : ' text-rose-400';",
    "          if (statusEl) {",
    "            statusEl.textContent = res.status + ' \\u2014 ' + ms + ' ms';",
    "            statusEl.className = 'status-label text-xs ' + (ok ? 'text-emerald-400' : 'text-rose-400');",
    "          }",
    "        });",
    "      })",
    "      .catch(function (err) {",
    "        respBox.textContent = 'Request failed (network error or CORS):\\n\\n' + (err.message || err);",
    "        respBox.className = respBox.className.replace(/text-slate-600|text-emerald-400/g, '') + ' text-rose-400';",
    "        if (statusEl) { statusEl.textContent = 'failed'; statusEl.className = 'status-label text-xs text-rose-400'; }",
    "      })",
    "      .finally(function () {",
    "        btn.disabled = false;",
    "        btn.querySelector('.btn-label').innerHTML = 'Try it &#8594;';",
    "      });",
    "  }",
    "",
    "  document.addEventListener('click', function (e) {",
    "    var btn = e.target.closest ? e.target.closest('.try-btn') : null;",
    "    if (!btn) return;",
    "    e.preventDefault();",
    "    tryIt(btn);",
    "  });",
    "",
    "  // ── Authentication Quick Start handlers",
    "  var authPhoneEl  = document.getElementById('auth-phone');",
    "  var authPhone2El = document.getElementById('auth-phone2');",
    "  var authOtpEl    = document.getElementById('auth-otp');",
    "",
    "  // Helper: update auth status indicator after successful login",
    "  function setAuthSuccess() {",
    "    var dot  = document.getElementById('auth-status-dot');",
    "    var txt2 = document.getElementById('auth-status-text');",
    "    var warn = document.getElementById('auth-warning-banner');",
    "    if (dot) { dot.className = 'auth-dot has-token'; }",
    "    if (txt2) { txt2.innerHTML = '<span class=\"text-emerald-400\">Authenticated</span> &mdash; token applied to all requests'; }",
    "    if (warn) { warn.className = 'auth-warning rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.07] p-6'; }",
    "  }",
    "",
    "  // ── CMS Login handler",
    "  var btnCmsLogin = document.getElementById('btn-cms-login');",
    "  if (btnCmsLogin) {",
    "    btnCmsLogin.addEventListener('click', function () {",
    "      var email    = (document.getElementById('cms-email') || {}).value || '';",
    "      var password = (document.getElementById('cms-password') || {}).value || '';",
    "      if (!email || !password) { alert('Enter email and password'); return; }",
    "      var base = getVal(baseUrlEl, '" + BASE_URL + "').replace(/\\/+$/, '');",
    "      var statusEl = document.getElementById('cms-status');",
    "      var respEl   = document.getElementById('cms-response');",
    "      var banner   = document.getElementById('cms-token-banner');",
    "      btnCmsLogin.disabled = true;",
    "      btnCmsLogin.querySelector('.btn-label').textContent = 'Logging in\\u2026';",
    "      if (statusEl) statusEl.textContent = '';",
    "      if (banner) banner.classList.add('hidden');",
    "      respEl.textContent = 'Loading\\u2026';",
    "      respEl.className = respEl.className.replace(/text-emerald-400|text-rose-400/g, '') + ' text-slate-600';",
    "      var t0 = performance.now();",
    "      fetch(base + '/cms/auth/login', {",
    "        method: 'POST',",
    "        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },",
    "        body: JSON.stringify({ email: email, password: password })",
    "      }).then(function (res) {",
    "        return res.text().then(function (txt) {",
    "          var ms = Math.round(performance.now() - t0);",
    "          var ok = res.status >= 200 && res.status < 300;",
    "          respEl.textContent = fmtResponse(res, txt);",
    "          respEl.className = respEl.className.replace(/text-slate-600|text-rose-400|text-emerald-400/g, '');",
    "          respEl.className += ok ? ' text-emerald-400' : ' text-rose-400';",
    "          if (statusEl) { statusEl.textContent = res.status + ' \\u2014 ' + ms + ' ms'; statusEl.className = 'text-xs ' + (ok ? 'text-emerald-400' : 'text-rose-400'); }",
    "          if (ok) {",
    "            try {",
    "              var data = JSON.parse(txt);",
    "              var token = data.token || data.accessToken || data.access_token || (data.data && (data.data.token || data.data.accessToken));",
    "              if (token && authEl) {",
    "                authEl.value = 'Bearer ' + token;",
    "                if (banner) banner.classList.remove('hidden');",
    "                setAuthSuccess();",
    "              }",
    "            } catch (_) {}",
    "          }",
    "        });",
    "      }).catch(function (err) {",
    "        respEl.textContent = 'Request failed: ' + (err.message || err);",
    "        respEl.className = respEl.className.replace(/text-slate-600|text-emerald-400/g, '') + ' text-rose-400';",
    "      }).finally(function () {",
    "        btnCmsLogin.disabled = false;",
    "        btnCmsLogin.querySelector('.btn-label').innerHTML = 'Log in &rarr;';",
    "      });",
    "    });",
    "  }",
    "",
    "  // Sync phone fields",
    "  if (authPhoneEl && authPhone2El) {",
    "    authPhoneEl.addEventListener('input', function () { authPhone2El.value = authPhoneEl.value; });",
    "  }",
    "",
    "  // Send OTP",
    "  var btnSendOtp = document.getElementById('btn-send-otp');",
    "  if (btnSendOtp) {",
    "    btnSendOtp.addEventListener('click', function () {",
    "      var phone = (authPhoneEl ? authPhoneEl.value : '').trim();",
    "      if (!phone) { alert('Enter a phone number first'); return; }",
    "      var base = getVal(baseUrlEl, '" + BASE_URL + "').replace(/\\/+$/, '');",
    "      var statusEl = document.getElementById('otp-status');",
    "      var respEl   = document.getElementById('otp-response');",
    "      btnSendOtp.disabled = true;",
    "      btnSendOtp.querySelector('.btn-label').textContent = 'Sending\\u2026';",
    "      if (statusEl) statusEl.textContent = '';",
    "      respEl.textContent = 'Loading\\u2026';",
    "      respEl.className = respEl.className.replace(/text-emerald-400|text-rose-400/g, '') + ' text-slate-600';",
    "      var t0 = performance.now();",
    "      fetch(base + '/auth/send-otp', {",
    "        method: 'POST',",
    "        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'accept-language': getVal(langEl, 'EN'), 'x-device-platform': getVal(platformEl, 'android') },",
    "        body: JSON.stringify({ phoneNumber: phone })",
    "      }).then(function (res) {",
    "        return res.text().then(function (txt) {",
    "          var ms = Math.round(performance.now() - t0);",
    "          var ok = res.status >= 200 && res.status < 300;",
    "          respEl.textContent = fmtResponse(res, txt);",
    "          respEl.className = respEl.className.replace(/text-slate-600|text-rose-400|text-emerald-400/g, '');",
    "          respEl.className += ok ? ' text-emerald-400' : ' text-rose-400';",
    "          if (statusEl) { statusEl.textContent = res.status + ' \\u2014 ' + ms + ' ms'; statusEl.className = 'text-xs ' + (ok ? 'text-emerald-400' : 'text-rose-400'); }",
    "          if (authPhone2El) authPhone2El.value = phone;",
    "        });",
    "      }).catch(function (err) {",
    "        respEl.textContent = 'Request failed: ' + (err.message || err);",
    "        respEl.className = respEl.className.replace(/text-slate-600|text-emerald-400/g, '') + ' text-rose-400';",
    "      }).finally(function () {",
    "        btnSendOtp.disabled = false;",
    "        btnSendOtp.querySelector('.btn-label').innerHTML = 'Send OTP &rarr;';",
    "      });",
    "    });",
    "  }",
    "",
    "  // Verify OTP",
    "  var btnVerify = document.getElementById('btn-verify-otp');",
    "  if (btnVerify) {",
    "    btnVerify.addEventListener('click', function () {",
    "      var phone = (authPhone2El ? authPhone2El.value : '').trim();",
    "      var code  = (authOtpEl ? authOtpEl.value : '').trim();",
    "      if (!phone || !code) { alert('Enter phone number and OTP code'); return; }",
    "      var base = getVal(baseUrlEl, '" + BASE_URL + "').replace(/\\/+$/, '');",
    "      var statusEl = document.getElementById('verify-status');",
    "      var respEl   = document.getElementById('verify-response');",
    "      var banner   = document.getElementById('token-saved-banner');",
    "      btnVerify.disabled = true;",
    "      btnVerify.querySelector('.btn-label').textContent = 'Verifying\\u2026';",
    "      if (statusEl) statusEl.textContent = '';",
    "      if (banner) banner.classList.add('hidden');",
    "      respEl.textContent = 'Loading\\u2026';",
    "      respEl.className = respEl.className.replace(/text-emerald-400|text-rose-400/g, '') + ' text-slate-600';",
    "      var t0 = performance.now();",
    "      fetch(base + '/auth/verify-otp', {",
    "        method: 'POST',",
    "        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'accept-language': getVal(langEl, 'EN'), 'x-device-platform': getVal(platformEl, 'android') },",
    "        body: JSON.stringify({ phoneNumber: phone, code: code })",
    "      }).then(function (res) {",
    "        return res.text().then(function (txt) {",
    "          var ms = Math.round(performance.now() - t0);",
    "          var ok = res.status >= 200 && res.status < 300;",
    "          respEl.textContent = fmtResponse(res, txt);",
    "          respEl.className = respEl.className.replace(/text-slate-600|text-rose-400|text-emerald-400/g, '');",
    "          respEl.className += ok ? ' text-emerald-400' : ' text-rose-400';",
    "          if (statusEl) { statusEl.textContent = res.status + ' \\u2014 ' + ms + ' ms'; statusEl.className = 'text-xs ' + (ok ? 'text-emerald-400' : 'text-rose-400'); }",
    "          if (ok) {",
    "            try {",
    "              var data = JSON.parse(txt);",
    "              var token = data.token || data.accessToken || data.access_token || (data.data && (data.data.token || data.data.accessToken));",
    "              if (token && authEl) {",
    "                authEl.value = 'Bearer ' + token;",
    "                if (banner) banner.classList.remove('hidden');",
    "                setAuthSuccess();",
    "              }",
    "            } catch (_) {}",
    "          }",
    "        });",
    "      }).catch(function (err) {",
    "        respEl.textContent = 'Request failed: ' + (err.message || err);",
    "        respEl.className = respEl.className.replace(/text-slate-600|text-emerald-400/g, '') + ' text-rose-400';",
    "      }).finally(function () {",
    "        btnVerify.disabled = false;",
    "        btnVerify.querySelector('.btn-label').innerHTML = 'Verify &amp; Get Token &rarr;';",
    "      });",
    "    });",
    "  }",
    "",
    "})();",
    "</script>",
  ].join("\n");

  // ── Full HTML
  var html = "";
  html += '<!doctype html>\n<html lang="en">\n<head>\n';
  html += '  <meta charset="utf-8" />\n';
  html += '  <meta name="viewport" content="width=device-width,initial-scale=1" />\n';
  html += "  <title>Muvi API Documentation</title>\n";
  html += '  <link rel="preconnect" href="https://fonts.googleapis.com">\n';
  html += '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n';
  html += '  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">\n';
  html += '  <script src="https://cdn.tailwindcss.com"></' + 'script>\n';
  html += "  <style>\n";
  html += '    body { font-family: "Sora", system-ui, -apple-system, sans-serif; }\n';
  html += '    code, pre, textarea.req-body { font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }\n';
  html += "    textarea.req-body { resize: vertical; }\n";
  html += "    ::-webkit-scrollbar { width: 6px; height: 6px; }\n";
  html += "    ::-webkit-scrollbar-track { background: transparent; }\n";
  html += "    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }\n";
  html += "    .endpoint-card:target { outline: 2px solid rgba(14,165,233,0.5); outline-offset: -2px; }\n";
  html += "    @keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:.4 } }\n";
  html += "    .auth-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }\n";
  html += "    .auth-dot.no-token  { background:#ef4444; animation:pulse-dot 1.5s ease-in-out infinite; }\n";
  html += "    .auth-dot.has-token { background:#22c55e; }\n";
  html += "    .auth-warning { transition: all 0.3s ease; }\n";
  html += "  </style>\n";
  html += "</head>\n";
  html += '<body class="bg-[#0B0F1A] text-slate-200">\n';

  // Gradient overlay
  html += '  <div class="min-h-screen relative">\n';
  html += '    <div class="absolute inset-0 opacity-30 pointer-events-none" style="background-image: radial-gradient(circle at 20% 20%, rgba(14,165,233,0.15), transparent 45%), radial-gradient(circle at 80% 10%, rgba(20,184,166,0.15), transparent 40%), radial-gradient(circle at 50% 80%, rgba(245,158,11,0.1), transparent 45%);"></div>\n';

  // Grid
  html += '    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-screen">\n';

  // ── Sidebar
  html += '      <aside class="hidden lg:flex flex-col border-r border-white/[0.06] bg-[#0B0F1A]/90 backdrop-blur-lg p-5 sticky top-0 h-screen overflow-y-auto">\n';
  html += '        <div class="text-white text-xl font-bold tracking-tight mb-1">Muvi API</div>\n';
  html += '        <div class="text-[11px] text-slate-600 mb-5">Base: ' + esc(BASE_URL) + "</div>\n";

  // Config inputs
  html += '        <div class="space-y-3 mb-5 pb-5 border-b border-white/[0.06]">\n';
  html += '          <div><label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1" for="baseUrl">Base URL</label>\n';
  html += '          <input id="baseUrl" class="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60" value="' + esc(BASE_URL) + '" /></div>\n';
  html += '          <div><label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1" for="authHeader">Authorization</label>\n';
  html += '          <input id="authHeader" class="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60" placeholder="Bearer eyJhbG..." /></div>\n';
  html += '          <div><label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1" for="langHeader">accept-language</label>\n';
  html += '          <input id="langHeader" class="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60" value="EN" /></div>\n';
  html += '          <div><label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1" for="platformHeader">x-device-platform</label>\n';
  html += '          <input id="platformHeader" class="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60" value="android" /></div>\n';
  html += "        </div>\n";

  // Nav
  html += '        <nav class="space-y-0.5 flex-1 overflow-y-auto text-sm">\n' + sidebarNav + "        </nav>\n";
  html += '        <div class="mt-4 pt-4 border-t border-white/[0.06] text-[10px] text-slate-700">Auto-generated &middot; ' + endpoints.length + " endpoints</div>\n";
  html += "      </aside>\n";

  // ── Main content
  html += '      <main class="p-6 lg:p-10 max-w-[1200px]">\n';

  // Hero
  html += '        <section id="overview" class="mb-10">\n';
  html += '          <div class="inline-flex items-center rounded-full bg-sky-500/10 text-sky-400 text-[11px] font-semibold px-3 py-1 mb-4 ring-1 ring-inset ring-sky-500/20">REST API Reference</div>\n';
  html += '          <h1 class="text-4xl sm:text-5xl font-bold text-white leading-tight">Muvi Platform API</h1>\n';
  html += '          <p class="mt-4 text-slate-500 max-w-2xl leading-relaxed">Interactive API documentation organized as a <strong class="text-slate-300">user-journey storybook</strong>. Each chapter follows what actually happens \u2014 from the moment an admin opens the CMS, to a customer browsing movies and booking tickets. Guest users can browse without any auth token.</p>\n';
  html += '          <div class="mt-6 flex flex-wrap gap-3">\n';
  html += '            <div class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300">' + endpoints.length + " endpoints</div>\n";
  html += '            <div class="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300">' + chapters.length + " chapters</div>\n";
  html += '            <div class="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-2.5 text-sm text-emerald-400">' + endpoints.filter(function (e) { return !e.requiresAuth; }).length + " public (no auth)</div>\n";
  html += '            <div class="rounded-lg border border-amber-500/10 bg-amber-500/[0.03] px-4 py-2.5 text-sm text-amber-400">' + endpoints.filter(function (e) { return e.requiresAuth; }).length + " authenticated</div>\n";
  html += "          </div>\n";
  html += "        </section>\n";

  // ── BEFORE YOU START — Big warning banner
  html += '        <section class="mb-10">\n';
  html += '          <div id="auth-warning-banner" class="auth-warning rounded-xl border-2 border-amber-500/30 bg-amber-500/[0.07] p-6">\n';
  html += '            <div class="flex items-start gap-4">\n';
  html += '              <div class="flex-shrink-0 mt-0.5">\n';
  html += '                <svg class="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>\n';
  html += '              </div>\n';
  html += '              <div>\n';
  html += '                <h3 class="text-lg font-bold text-amber-400 mb-1">Before You Start Testing</h3>\n';
  html += '                <p class="text-sm text-amber-200/70 leading-relaxed mb-3">\n';
  html += '                  <strong>' + endpoints.filter(function (e) { return e.requiresAuth; }).length + ' out of ' + endpoints.length + '</strong> endpoints require authentication.\n';
  html += '                  If you try to call them without a token, you will get a <code class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs font-mono">500</code> or <code class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs font-mono">401</code> error.\n';
  html += '                </p>\n';
  html += '                <p class="text-sm text-amber-200/70 leading-relaxed mb-4">\n';
  html += '                  <strong>You must complete the authentication steps below first</strong> to get a Bearer token. Once obtained, it will be automatically applied to all requests.\n';
  html += '                </p>\n';
  html += '                <div class="flex items-center gap-2">\n';
  html += '                  <span class="auth-dot no-token" id="auth-status-dot"></span>\n';
  html += '                  <span class="text-xs font-semibold" id="auth-status-text"><span class="text-rose-400">Not authenticated</span> &mdash; complete the steps below</span>\n';
  html += '                </div>\n';
  html += '              </div>\n';
  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </section>\n';

  // ── HOW TO AUTHENTICATE — Tabbed: CMS Login vs Mobile OTP
  html += '        <section id="authenticate" class="mb-16">\n';
  html += '          <h2 class="text-3xl font-bold text-white mb-2">How to Authenticate</h2>\n';
  html += '          <p class="text-slate-500 max-w-2xl leading-relaxed mb-6">Choose a method below. The token is auto-saved so you don&rsquo;t need to copy-paste anything.</p>\n';

  // Tab buttons
  html += '          <div class="flex gap-2 mb-6">\n';
  html += '            <button type="button" id="tab-cms" class="auth-tab active rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-emerald-500/20 text-emerald-400 ring-1 ring-inset ring-emerald-500/30" onclick="switchAuthTab(\'cms\')">\n';
  html += '              CMS Login <span class="ml-1 text-[10px] rounded-full bg-emerald-500/30 px-2 py-0.5 font-bold">Recommended</span>\n';
  html += '            </button>\n';
  html += '            <button type="button" id="tab-otp" class="auth-tab rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-white/5 text-slate-500 ring-1 ring-inset ring-white/10 hover:text-slate-300" onclick="switchAuthTab(\'otp\')">\n';
  html += '              Mobile OTP <span class="ml-1 text-[10px] rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-400 font-bold">Limited locally</span>\n';
  html += '            </button>\n';
  html += '          </div>\n';

  // ──────── TAB 1: CMS Login (recommended) ────────
  html += '          <div id="panel-cms" class="auth-panel">\n';
  html += '            <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 max-w-lg">\n';
  html += '              <div class="flex items-center gap-2 mb-1">\n';
  html += '                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">&#9889;</span>\n';
  html += '                <h3 class="text-lg font-semibold text-white">CMS Login</h3>\n';
  html += '                <span class="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 ring-1 ring-inset ring-sky-500/30">POST</span>\n';
  html += '                <code class="text-xs text-slate-400">/cms/auth/login</code>\n';
  html += '              </div>\n';
  html += '              <p class="text-xs text-slate-500 mb-4 pl-9">Log in with the seeded CMS admin account. This works <strong class="text-emerald-400">instantly</strong> in local dev &mdash; no external services required.</p>\n';
  html += '              <div class="rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 px-4 py-3 mb-4">\n';
  html += '                <p class="text-[11px] text-emerald-400 font-semibold mb-1">Pre-seeded credentials</p>\n';
  html += '                <p class="text-xs text-emerald-300/70">Email: <code class="font-mono text-emerald-300">admin@muvi.local</code></p>\n';
  html += '                <p class="text-xs text-emerald-300/70">Password: <code class="font-mono text-emerald-300">Admin1234</code></p>\n';
  html += '              </div>\n';
  html += '              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Email <span class="text-rose-400">*</span></label>\n';
  html += '              <input id="cms-email" class="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-emerald-500/60 font-mono mb-3" value="admin@muvi.local" />\n';
  html += '              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Password <span class="text-rose-400">*</span></label>\n';
  html += '              <input id="cms-password" type="password" class="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-emerald-500/60 font-mono mb-4" value="Admin1234" />\n';
  html += '              <div class="flex items-center gap-3">\n';
  html += '                <button type="button" id="btn-cms-login" class="rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none">\n';
  html += '                  <span class="btn-label">Log in &rarr;</span>\n';
  html += '                </button>\n';
  html += '                <span id="cms-status" class="text-xs text-slate-600"></span>\n';
  html += '              </div>\n';
  html += '              <pre id="cms-response" class="mt-4 text-[11px] leading-[1.6] overflow-auto rounded-lg bg-black/50 p-4 ring-1 ring-inset ring-white/[0.04] text-slate-600 min-h-[40px] max-h-[200px]">Click &ldquo;Log in&rdquo; to authenticate.</pre>\n';
  html += '              <div id="cms-token-banner" class="hidden mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400">\n';
  html += '                <div class="font-bold mb-1">&#10003; Authentication Successful!</div>\n';
  html += '                <p>Your Bearer token has been auto-saved to the Authorization field in the sidebar. All &ldquo;Try it&rdquo; buttons will use it automatically.</p>\n';
  html += '              </div>\n';
  html += '            </div>\n';
  html += '            <div class="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 max-w-lg">\n';
  html += '              <p class="text-xs text-slate-500"><strong class="text-slate-300">Note:</strong> The CMS token grants access to <strong class="text-slate-300">CMS endpoints</strong> (<code class="text-xs text-slate-400">/cms/*</code>). Mobile-only endpoints (e.g. <code class="text-xs text-slate-400">/auth/me</code>) require a mobile OTP token.</p>\n';
  html += '            </div>\n';
  html += '          </div>\n';

  // ──────── TAB 2: Mobile OTP ────────
  html += '          <div id="panel-otp" class="auth-panel hidden">\n';

  // Local dev limitation warning
  html += '            <div class="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-4 mb-6 max-w-2xl">\n';
  html += '              <p class="text-xs text-amber-300/80"><strong class="text-amber-400">&#9888; Local Dev Limitation:</strong> The <code class="text-xs">send-otp</code> step works (SMS is mocked), but <code class="text-xs">verify-otp</code> may fail because the Vista loyalty service is not mocked in <code class="text-xs">NODE_ENV=local</code>. Use <strong>CMS Login</strong> above for reliable local testing.</p>\n';
  html += '            </div>\n';

  // Flow diagram
  html += '            <div class="flex flex-wrap items-center gap-3 mb-8 text-xs">\n';
  html += '              <div class="flex items-center gap-2 rounded-full bg-sky-500/10 text-sky-400 px-3 py-1.5 ring-1 ring-inset ring-sky-500/20 font-semibold">\n';
  html += '                <span class="w-5 h-5 rounded-full bg-sky-500/30 flex items-center justify-center text-[10px] font-bold">1</span> Enter phone\n';
  html += '              </div>\n';
  html += '              <svg class="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>\n';
  html += '              <div class="flex items-center gap-2 rounded-full bg-sky-500/10 text-sky-400 px-3 py-1.5 ring-1 ring-inset ring-sky-500/20 font-semibold">\n';
  html += '                <span class="w-5 h-5 rounded-full bg-sky-500/30 flex items-center justify-center text-[10px] font-bold">2</span> Send OTP (mocked)\n';
  html += '              </div>\n';
  html += '              <svg class="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>\n';
  html += '              <div class="flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1.5 ring-1 ring-inset ring-emerald-500/20 font-semibold">\n';
  html += '                <span class="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-[10px] font-bold">3</span> Verify OTP &rarr; Token\n';
  html += '              </div>\n';
  html += '            </div>\n';

  html += '            <div class="grid gap-8 lg:grid-cols-2">\n';

  // Step 1: Send OTP
  html += '              <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">\n';
  html += '                <div class="flex items-center gap-2 mb-1">\n';
  html += '                  <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">1</span>\n';
  html += '                  <h3 class="text-lg font-semibold text-white">Send OTP</h3>\n';
  html += '                  <span class="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 ring-1 ring-inset ring-sky-500/30">POST</span>\n';
  html += '                  <code class="text-xs text-slate-400">/auth/send-otp</code>\n';
  html += '                </div>\n';
  html += '                <p class="text-xs text-slate-500 mb-4 pl-9">Enter your phone number below and click &ldquo;Send OTP&rdquo;. In <strong class="text-amber-400">local dev</strong>, no real SMS is sent.</p>\n';
  html += '                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Phone Number <span class="text-rose-400">*</span></label>\n';
  html += '                <input id="auth-phone" class="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60 font-mono mb-1" placeholder="+966500000000" />\n';
  html += '                <p class="text-[10px] text-slate-600 mb-4">Format: international with country code, e.g. +966XXXXXXXXX</p>\n';
  html += '                <div class="flex items-center gap-3">\n';
  html += '                  <button type="button" id="btn-send-otp" class="rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-sky-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none">\n';
  html += '                    <span class="btn-label">Send OTP &rarr;</span>\n';
  html += '                  </button>\n';
  html += '                  <span id="otp-status" class="text-xs text-slate-600"></span>\n';
  html += '                </div>\n';
  html += '                <pre id="otp-response" class="mt-4 text-[11px] leading-[1.6] overflow-auto rounded-lg bg-black/50 p-4 ring-1 ring-inset ring-white/[0.04] text-slate-600 min-h-[40px] max-h-[200px]">Response will appear here after you click &ldquo;Send OTP&rdquo;.</pre>\n';
  html += '              </div>\n';

  // Step 2: Verify OTP
  html += '              <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">\n';
  html += '                <div class="flex items-center gap-2 mb-1">\n';
  html += '                  <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">2</span>\n';
  html += '                  <h3 class="text-lg font-semibold text-white">Verify OTP &amp; Get Token</h3>\n';
  html += '                  <span class="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 ring-1 ring-inset ring-sky-500/30">POST</span>\n';
  html += '                  <code class="text-xs text-slate-400">/auth/verify-otp</code>\n';
  html += '                </div>\n';
  html += '                <p class="text-xs text-slate-500 mb-4 pl-9">Enter the 4-digit code below. In <strong class="text-amber-400">local dev</strong>, use test code <code class="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">5555</code>. On success, your Bearer token will be <strong class="text-slate-300">automatically saved</strong> to the sidebar.</p>\n';
  html += '                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Phone Number <span class="text-rose-400">*</span></label>\n';
  html += '                <input id="auth-phone2" class="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60 font-mono mb-3" placeholder="+966500000000" />\n';
  html += '                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">OTP Code <span class="text-rose-400">*</span></label>\n';
  html += '                <input id="auth-otp" class="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-sky-500/60 font-mono mb-1" placeholder="5555" value="5555" />\n';
  html += '                <p class="text-[10px] text-slate-600 mb-4">Local dev test code: <strong>5555</strong> (no SMS sent locally). Production uses real 6-digit OTP via SMS.</p>\n';
  html += '                <div class="flex items-center gap-3">\n';
  html += '                  <button type="button" id="btn-verify-otp" class="rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none">\n';
  html += '                    <span class="btn-label">Verify &amp; Get Token &rarr;</span>\n';
  html += '                  </button>\n';
  html += '                  <span id="verify-status" class="text-xs text-slate-600"></span>\n';
  html += '                </div>\n';
  html += '                <pre id="verify-response" class="mt-4 text-[11px] leading-[1.6] overflow-auto rounded-lg bg-black/50 p-4 ring-1 ring-inset ring-white/[0.04] text-slate-600 min-h-[40px] max-h-[200px]">Response will appear here after you click &ldquo;Verify&rdquo;.</pre>\n';
  html += '                <div id="token-saved-banner" class="hidden mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400">\n';
  html += '                  <div class="font-bold mb-1">&#10003; Authentication Successful!</div>\n';
  html += '                  <p>Your Bearer token has been auto-saved to the Authorization field in the sidebar. All &ldquo;Try it&rdquo; buttons will use it automatically.</p>\n';
  html += '                </div>\n';
  html += '              </div>\n';

  html += '            </div>\n'; // end grid
  html += '          </div>\n'; // end panel-otp

  // What happens next (shared)
  html += '          <div class="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">\n';
  html += '            <h4 class="text-sm font-semibold text-white mb-2">What happens next?</h4>\n';
  html += '            <ul class="space-y-1.5 text-xs text-slate-500 list-inside">\n';
  html += '              <li class="flex items-start gap-2"><span class="text-emerald-500 mt-px">&#10003;</span> The token is automatically pasted into the <strong class="text-slate-300">Authorization</strong> field in the sidebar on the left.</li>\n';
  html += '              <li class="flex items-start gap-2"><span class="text-emerald-500 mt-px">&#10003;</span> Every <strong class="text-slate-300">&ldquo;Try it &rarr;&rdquo;</strong> button below will include this token as a Bearer header.</li>\n';
  html += '              <li class="flex items-start gap-2"><span class="text-emerald-500 mt-px">&#10003;</span> Endpoints marked <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25">AUTH</span> will now return real data instead of 401/500 errors.</li>\n';
  html += '              <li class="flex items-start gap-2"><span class="text-sky-500 mt-px">&#9432;</span> If your token expires, come back to this section and repeat the flow to get a new one.</li>\n';
  html += '            </ul>\n';
  html += '          </div>\n';

  html += '        </section>\n';

  // Sections — rendered as storybook chapters
  html += '        <div class="space-y-12">\n';
  var currentPartId = '';
  for (var si = 0; si < chapters.length; si++) {
    var chEntry = chapters[si];
    // Part divider
    if (chEntry.chapter.part !== currentPartId) {
      currentPartId = chEntry.chapter.part;
      var partTitle = currentPartId === 'CMS' ? 'Part I \u2014 CMS (Admin Panel)' : currentPartId === 'Website' ? 'Part II \u2014 Website (Customer Journey)' : currentPartId === 'Kiosk' ? 'Kiosk' : currentPartId;
      html += '          <div class="text-center py-8 border-t border-b border-white/[0.06]">\n';
      html += '            <div class="text-[11px] font-bold uppercase tracking-[3px] text-sky-400 mb-1">' + esc(currentPartId) + '</div>\n';
      html += '            <div class="text-xl font-bold text-white">' + esc(partTitle) + '</div>\n';
      if (currentPartId === 'CMS') {
        html += '            <p class="text-xs text-slate-500 mt-2 max-w-xl mx-auto">Your team lead sits you down: \u201cLet me walk you through the admin panel. This is where we manage movies, cinemas, offers, and everything else.\u201d</p>\n';
      } else if (currentPartId === 'Kiosk') {
        html += '            <p class="text-xs text-slate-500 mt-2 max-w-xl mx-auto">Standalone self-service terminals in cinema lobbies. They authenticate with kiosk keys, not user tokens.</p>\n';
      } else if (currentPartId === 'Website') {
        html += '            <p class="text-xs text-slate-500 mt-2 max-w-xl mx-auto">\u201cNow let\u2019s see what the customer sees.\u201d Open <code class="text-slate-400">muvicinemas.com</code>. A guest can browse movies, cinemas, and showtimes <strong class="text-emerald-400">without any login</strong>. Auth is only needed for booking, payments, and profile.</p>\n';
      }
      html += '          </div>\n';
    }
    html += renderChapter(chEntry);
  }
  html += '        </div>\n';
  html += "      </main>\n";
  html += "    </div>\n";
  html += "  </div>\n";

  html += scriptBlock + "\n";
  html += "</body>\n</html>\n";

  return html;
}

/* ── Run ────────────────────────────────────────────────────────────── */

var allFiles = walkDir(ROOT);
var endpoints = parseControllers(allFiles).sort(function (a, b) { return a.path.localeCompare(b.path); });
var html = buildHtml(endpoints, allFiles);
fs.writeFileSync(OUT_FILE, html, "utf8");
console.log("Generated " + OUT_FILE + " with " + endpoints.length + " endpoints");
