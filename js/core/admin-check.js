/*
 * Copyright (c) 2026 Handi Homepage
 * This file is part of HandiHomepage and is released under the GNU General Public License v3.0.
 * See the LICENSE file in the repository root for full details.
 */

// js/admin-check.js - Check if user has premium access (Stripe subscription)
const USER_ACCESS = {
  isPremium: false,
  isAdmin: false,
  userId: null,
};

async function checkUserAccess() {
  const host = window.location.hostname;
  // Dev/staging always premium
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("staging.")
  ) {
    USER_ACCESS.isPremium = true;
    return true;
  }
  // Check Stripe subscription
  const subId = localStorage.getItem("stripe_subscription_id");
  if (subId) {
    try {
      const resp = await fetch(
        `/api/subscription/status?subscription_id=${encodeURIComponent(subId)}`,
      );
      const data = await resp.json();
      USER_ACCESS.isPremium = data.premium === true;
      return USER_ACCESS.isPremium;
    } catch (e) {
      console.warn("Subscription check failed:", e);
    }
  }
  USER_ACCESS.isPremium = false;
  return false;
}

function hasWebRTCAccess() {
  return USER_ACCESS.isPremium || USER_ACCESS.isAdmin;
}
