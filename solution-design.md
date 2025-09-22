# SuperMall — Solution Design (LLD) and System Architecture

---

## Contents

1. Executive summary
2. Objectives & scope
3. Glossary
4. High-level architecture overview
5. Low-Level Design (LLD)

   * Components & responsibilities
   * Data model (detailed)
   * Firestore security rules (logical)
   * Client-side modules & APIs
   * UI component behavior & state flows
   * Error handling & logging
   * Testing strategy
6. Wireframes (page-by-page)
7. Deployment & operational architecture
8. Non-functional requirements & quality attributes
9. Security & privacy considerations
10. Risks, tradeoffs and recommendations
11. Appendices

* Sequence diagrams (textual)
* Data validation rules
* Suggested Cloud Functions

---

# 1. Executive summary

This document contains a complete low-level design (LLD) and system architecture for the SuperMall web application (Admin & User). It describes the client architecture (single page app), data model (Firestore), authentication and authorization (Firebase Auth + Firestore role checks), operational concerns, wireframes for the UI, and suggested deployment pattern. The target is a responsive, maintainable, and secure admin/user portal backed by Firebase services.

# 2. Objectives & scope

* Provide admin capabilities: create/edit/delete shops and offers, view logs, approve admin requests.
* Provide user capabilities: browse shops, filter, view offers, compare products.
* Use Firebase (Auth, Firestore, Hosting, Storage) as primary platform.
* Implement inline editing in admin UI, role-based access enforcement, audit logs.

Out of scope: heavy analytics pipeline, payment flows, multi-tenant isolation.

# 3. Glossary

* **Admin**: user with role `admin` able to manage shops/offers and view logs.
* **admin\_request**: initial registration role for admin signups.
* **Firestore**: Google Cloud Firestore (NoSQL) used for data storage.
* **Auth**: Firebase Authentication (email/password).

# 4. High-level architecture overview

* **Client (SPA)**: JavaScript modules, modular pages (index, admin-dashboard, user-dashboard, login/register, etc.). Uses Firebase JS SDK (Auth + Firestore). Hosts on Firebase Hosting.
* **Firestore**: collections: `profiles`, `emails`, `shops`, `offers`, `logs`.
* **Cloud Functions (recommended)**: for privileged operations (approve admin, send customized emails, scheduled backups, enriched logs).
* **Storage**: for images (shop logos) — `storageBucket`.
* **CI/CD**: GitHub Actions → firebase deploy.

# 5. Low-Level Design (LLD)

## 5.1 Components & responsibilities

* **Auth Module** (`auth.js`)

  * registerWithEmail(email, password)
  * loginWithEmail(email, password)
  * logout()
  * onAuthChange(cb)
  * requestPasswordReset(email) — wrapper around `sendPasswordResetEmail`

* **DB Module** (`db.js`)

  * Profile management: `createProfile(uid, email, role)`, `getProfileByUid`, `getProfileByEmail`
  * Shops: `createShop(data)`, `listShops()`, `getShop(id)`, `updateShop(id, data)`, `deleteShop(id)`
  * Offers: `createOffer(data)`, `listOffers()`, `getOffer(id)`, `updateOffer(id, data)`, `deleteOffer(id)`
  * Admin Requests: `listAdminRequests()`, `approveAdminByEmail(email)` (server-side hardened)

* **Logger** (`logger.js`)

  * `logAction(uid, action, meta)` -> writes to `logs` collection with `ts: serverTimestamp()` and `actorUid`.

* **UI Pages**

  * `index.html` (landing) — animation + two big boxes (Admin / User)
  * `admin-dashboard.html` — uses admin-dashboard.js (nav, create/edit shops/offers, logs)
  * `user-dashboard.html` — browse/filter/compare
  * `auth` pages — login/register for admin and user

## 5.2 Data model (detailed)

Collections and example documents:

### `profiles/{uid}`

```json
{
  uid: "uid123",
  email: "user@example.com",
  role: "user" | "admin" | "admin_request",
  createdAt: Timestamp
}
```

### `emails/{emailId}`

(Indexed by encoded email; used to prevent duplicate registrations and to store requested role)

```json
{
  uid: "uid123",
  email: "user%40example.com",
  role: "user" | "admin_request" | "admin"
}
```

### `shops/{shopId}`

```json
{
  name: "Shoes World",
  category: "Footwear",
  floor: "1",
  description: "...",
  ownerUid: "uid123",
  createdAt: Timestamp,
  logoPath: "shops/logos/<shopId>.png"
}
```

### `offers/{offerId}`

```json
{
  shopId: "shopId",
  title: "Clearance 50%",
  product: { name: "SneakerX", price: 49.99, features: "..." },
  createdByUid: "uid123",
  createdAt: Timestamp
}
```

### `logs/{logId}`

```json
{
  ts: Timestamp,
  action: "createShop" | "updateOffer" | ...,
  actorUid: "uid123",
  meta: { shopId: "...", details: "..." }
}
```

## 5.3 Firestore Security Rules (logical, LLD)

**Goal**: enforce read/write per role.

* `profiles/{uid}`: allow read/write only if `request.auth != null && request.auth.uid == uid` (user manages own profile).
* `emails/{emailId}`: allow write only for authenticated users (creating registration requests). Reading allowed to admins.
* `shops/{shopId}`: read allowed to authenticated users; write (create/update/delete) allowed if `get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'admin'` **or** `== 'admin_request'` is NOT permitted — approve via cloud function. (Note: you asked earlier to use admin\_request — recommended flow is: only update to `admin` by Cloud Function/approved admin)
* `offers/{offerId}`: similar to shops.
* `logs/{logId}`: write allowed to any authenticated user; read allowed only to admin.

**Important**: Keep any sensitive elevation (approving admin) in **Cloud Functions** authenticated and callable only by existing admins.

## 5.4 Client-side modules & APIs

* Use Firebase modular SDK v10 imports.
* Prefer `async/await` and central error handling wrapper.
* Centralized `api` module can wrap db.js functions to add retries and friendly errors.

Example client flow for editing a shop inline (LLD steps):

1. UI shows shop list, each row has `Edit` button.
2. Clicking `Edit` toggles the row into editable inputs plus `Save` and `Cancel` buttons (styled to match navbar theme).
3. `Save` triggers `updateShop(shopId, payload)` -> db writes -> on success re-render list -> logAction.
4. Validation occurs client-side (non-empty name, numeric floor) and server-side (security rules + Cloud Function validation if needed).

## 5.5 UI component behavior & state flows

* **Navbar**: left logo; right group of nav buttons and Logout. Buttons have `data-target` attribute. Only the targeted section gets `.active` class; others hidden.
* **Admin dashboards**: sections are `createShopSection`, `manageShopsSection`, `manageOffersSection`, `logsSection`. Default is `createShopSection`.
* **Inline edit**: when editing, the form fields are limited to that row; Save and Cancel only affect that row.
* **Forms**: provide accessible labels, client-side validation, and error feedback inline (not alerts).
* **Animations**: landing page animation (logo scale + burst pieces) implemented with CSS + JS canvas/particles. After animation, show two large cards.

## 5.6 Error handling & logging

* Centralize try/catch in each async handler. Show inline error text in UI (red) and avoid alert boxes.
* Log all important actions to `logs` collection with `ts` and `actorUid`.
* For critical failures, send errors to monitoring/console (Sentry or Google Cloud Error Reporting recommended).

## 5.7 Testing strategy

* Unit tests for utility functions (e.g., `emailToId`) and non-Firebase logic.
* Integration tests using Firebase Emulator Suite for rules, Cloud Functions, Firestore reads/writes.
* Manual E2E tests for flows: registration, admin approval, create/edit/delete shops/offers, password reset.

# 6. Wireframes (page-by-page)

> All wireframes use the same top navbar (logo left, nav buttons and logout right). Only the target content section is visible at a time.

## Landing (index.html) — sequence

1. Fullscreen centered logo image (assets/logo.png) appears, scales up slightly (0.9 → 1.2), then "burst" animation (image splits into particles that fly out / fade).
2. After burst, reveal two large square cards centered horizontally with heading above: **"Welcome to SuperMall"**.
3. Left card: Admin — two buttons: *Admin Register*, *Admin Login*.
4. Right card: User — *User Register*, *User Login*.

(ASCII sketch)

```
+-----------------------------------------------------------+
|                     Welcome to SuperMall                  |
|                                                           |
|   [   BIG SQUARE: Admin    ]   [   BIG SQUARE: User    ]  |
|   [ Admin Register | Login ]   [ User Register | Login ]  |
+-----------------------------------------------------------+
```

## Admin Dashboard

* Navbar: logo left; buttons (Create Shop, Manage Shops, Manage Offers, Logs) and Logout right.
* Content area: only one of the sections visible. Each section has larger fonts and inputs styled to match navbar colors.
* Manage Shops: cards list with each row showing details + `Edit | Delete`. Clicking Edit expands inline inputs (same card) with Save and Cancel buttons styled as primary/secondary.

## User Dashboard

* Navbar same style.
* Sections: Filter Shops, Shops, Offers, Compare Products.
* FilterSection: two big dropdowns styled like navbar buttons; Apply Filter button.
* Shops list: each shop rendered in a larger card with readable font-size.
* Compare Table: large table, highlight cheapest cell in green.

# 7. Deployment & operational architecture

* Host SPA on **Firebase Hosting** with single `index.html` fallback for SPA routing.
* Use **Firebase Auth** for identity.
* Use **Firestore** in native mode for DB.
* Optional **Cloud Functions**:

  * `approveAdmin(email)` — callable or HTTP endpoint protected so only admins can call. Updates `emails/{emailId}` and `profiles/{uid}`.
  * `sendCustomResetEmail` — to send branded emails using SendGrid if you want custom email body.
* CI/CD: GitHub Actions to run linters, tests, then `firebase deploy`.

# 8. Non-functional requirements & quality attributes

* Availability: rely on Firebase SLAs. Use caching on client for non-sensitive data.
* Performance: paginate or limit `listShops()`/`listOffers()` if dataset grows. Use Firestore indexes for queries.
* Scalability: Firestore scales automatically; Cloud Functions scale on invocation.
* Maintainability: modular JS code, central `db.js` and `auth.js`, and consistent CSS variables for color/spacing.

# 9. Security & privacy considerations

* Enforce Firestore rules strictly; never rely solely on client role checks.
* Store minimal PII. Use `emails` collection only as needed.
* For admin elevation, use Cloud Functions callable by admins. Do not allow client to set `role: admin` directly.
* Protect storage bucket rules to allow writes only from authenticated owners when uploading logos.
* Use HTTPS everywhere (Firebase Hosting uses HTTPS by default).

# 10. Risks, tradeoffs and recommendations

* **Risk**: Client-side role checks can be bypassed. **Mitigation**: Harden rules + Cloud Functions for privileged updates.
* **Tradeoff**: Storing `emails` collection helps de-dup, but carries additional PII risk — ensure rules protect reads.
* **Recommendation**: Implement an approval workflow (admin GUI + Cloud Function) for admin elevation, and use email templates in Firebase console for password reset branding.

# 11. Appendices

## 11.1 Sequence: Admin creates a shop (textual)

1. Admin clicks "Create Shop".
2. Client validates fields; calls `createShop()` (db.addDoc).
3. Firestore rules allow the write because user is admin (rule checked).
4. `createShop()` also calls `logAction()` to append to `logs`.
5. Client refreshes shop list.

## 11.2 Sequence: Admin approval flow (recommended)

1. Admin registers with role `admin_request`.
2. Existing admin uses an "Admin Requests" UI to approve. Approval invokes a Cloud Function `approveAdmin(email)`.
3. Cloud Function checks that the caller is admin (via callable auth token) and updates `emails/{emailId}.role = 'admin'` and `profiles/{uid}.role = 'admin'`.
4. Cloud Function logs action.

## 11.3 Data validation rules (client + server expected rules)

* `shop.name` required & non-empty string
* `shop.floor` numeric or short string (e.g., 'G', '1')
* `offer.product.price` must be number >= 0

## 11.4 Suggested Cloud Functions

* `approveAdmin(email)` — callable (admin-only)
* `sendCustomPasswordReset(email)` — HTTP trigger to send branded email (if you want more control than Firebase templates)
* `onUserDeleteCleanup` — handles orphan records if a profile is deleted

---

If you want I can also:

* produce SVG wireframes or quick PNG mockups (describe exact styling);
* provide GitHub Actions YAML for CI/CD and `firebase.json` sample;
* provide example Firestore security rules code and Cloud Function implementations for `approveAdmin` and `sendCustomPasswordReset`.
