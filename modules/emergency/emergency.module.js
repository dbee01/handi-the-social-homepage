// modules/emergency/emergency.module.js
import { loadSettings } from "../../js/core/settings.js";

function osmShortlink(lat, lon) {
  var codeChars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~",
    base = codeChars.length;
  var latInt = Math.floor((lat + 90) * 10000),
    lonInt = Math.floor((lon + 180) * 10000);
  if (latInt < 0) latInt = 0;
  if (latInt >= 1800000) latInt = 1800000 - 1;
  if (lonInt < 0) lonInt = 0;
  if (lonInt >= 3600000) lonInt = 3600000 - 1;
  var combined = lonInt * 1800000 + latInt,
    result = "";
  while (combined > 0) {
    result = codeChars[combined % base] + result;
    combined = Math.floor(combined / base);
  }
  return result || "0";
}

function isPlausibleIrelandLocation(lat, lon) {
  return lat >= 51.0 && lat <= 55.5 && lon >= -11.0 && lon <= -5.5;
}

export default async function initEmergency(container) {
  var t =
    window.t ||
    function (k, e) {
      return e || k;
    };

  var headerRow = document.createElement("div");
  headerRow.className = "emergency-header-row";
  var title = document.createElement("div");
  title.className = "panel-title";
  title.innerHTML =
    '<i class="fa-solid fa-mobile-screen"></i> ' +
    t(
      "modules.emergency_alert.name",
      window.LANG && window.LANG.modules && window.LANG.modules.emergency_alert
        ? window.LANG.modules.emergency_alert.name
        : "LOCATE",
    );
  headerRow.appendChild(title);

  var headerActions = document.createElement("div");
  headerActions.className = "emergency-header-actions";
  var lockToggle = document.createElement("button");
  lockToggle.className = "emergency-lock-toggle";
  var saved = localStorage.getItem("emergencyLocked"),
    isLocked = saved !== null ? saved === "true" : true;
  function updateLockIcon() {
    lockToggle.innerHTML = isLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockToggle.style.color = isLocked ? "#cc0000" : "#008000";
  }
  updateLockIcon();
  lockToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isLocked = !isLocked;
    localStorage.setItem("emergencyLocked", isLocked);
    updateLockIcon();
    var btn = content.querySelector("#emergencyTriggerBtn");
    if (btn) applyLockState(btn);
  });
  headerActions.appendChild(lockToggle);

  var originalPinBtn = container.querySelector(".pin-btn"),
    pinBtn = null;
  if (originalPinBtn) {
    pinBtn = originalPinBtn.cloneNode(true);
    pinBtn.classList.add("pin-btn-clone");
    originalPinBtn.style.display = "none";
    headerActions.appendChild(pinBtn);
  }
  headerRow.appendChild(headerActions);
  container.innerHTML = "";
  container.appendChild(headerRow);

  var contentWrapper = document.createElement("div");
  contentWrapper.className = "emergency-content-wrapper";
  container.appendChild(contentWrapper);
  var content = document.createElement("div");
  content.style.cssText = "padding:10px;text-align:center;";
  contentWrapper.appendChild(content);

  function applyLockState(btn) {
    if (isLocked) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
      btn.onmouseenter = null;
      btn.onmouseleave = null;
    } else {
      btn.disabled = false;
      btn.style.opacity = "";
      btn.style.cursor = "";
      btn.innerHTML =
        '<i class="fa-solid fa-mobile-screen" style="font-size:2rem;"></i><span>' +
        t("d_share", "SHARE") +
        '</span><span style="font-size:0.7rem;">' +
        t("d_send", "Send") +
        "</span>";
      btn.onmouseenter = function () {
        btn.style.transform = "scale(1.05)";
        btn.style.boxShadow = "0 0 25px rgba(255,0,0,0.9)";
      };
      btn.onmouseleave = function () {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "0 0 15px rgba(255,0,0,0.6)";
      };
    }
  }

  async function sendSMS(phoneNumber, shortlink) {
    var settings = loadSettings(),
      webrtc = settings.webrtc || {};
    var baseUrl = webrtc.baseUrl || "",
      apiKey = webrtc.apiKey || "",
      from = webrtc.callerId || "InfoSMS";
    if (!baseUrl || !apiKey)
      return { success: false, error: "Infobip not configured" };
    var fullLink = "https://osm.org/go/" + shortlink;
    var message =
      "📍 " +
      t("d_locationShared", "Someone shared their location with you.") +
      "\n\n" +
      t("d_location", "Location") +
      ": " +
      fullLink +
      "\n" +
      t("d_time", "Time") +
      ": " +
      new Date().toLocaleString();
    var cleanNumber = phoneNumber.replace(/^\+/, "");
    try {
      var resp = await fetch("https://" + baseUrl + "/sms/3/messages", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              sender: from,
              destinations: [{ to: cleanNumber }],
              content: { text: message },
            },
          ],
        }),
      });
      if (!resp.ok) {
        var detail = "HTTP " + resp.status;
        try {
          var eb = await resp.json();
          detail += " — " + (eb.description || JSON.stringify(eb));
        } catch (e) {}
        throw new Error(detail);
      }
      return { success: true, data: await resp.json() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function render() {
    var settings = loadSettings(),
      contacts = settings.emergency_alert?.contacts || [];
    if (!contacts.length) {
      var pc = settings.phone?.contacts || [];
      contacts = pc.filter(function (c) {
        return c.share_location;
      });
    }
    if (!contacts.length) {
      content.innerHTML =
        '<div class="module-empty"><i class="fa-solid fa-mobile-screen"></i><p>' +
        t("d_noTrustedContacts", "No trusted contacts saved.") +
        '</p><button id="emergencySettingsBtn" class="settings-link-btn"><i class="fa-solid fa-gear"></i> ' +
        t("d_addContacts", "Add Contacts") +
        "</button></div>";
      var sb = content.querySelector("#emergencySettingsBtn");
      if (sb)
        sb.onclick = function () {
          location.href = "settings.html?args=emergency";
        };
      return;
    }
    content.innerHTML = "";
    var emergencyBtn = document.createElement("button");
    emergencyBtn.id = "emergencyTriggerBtn";
    emergencyBtn.style.cssText =
      "width:160px;height:160px;border-radius:50%;border:3px solid #ffffff;color:white;background:radial-gradient(circle at 30% 30%, #cc0000, #800000) !important;font-size:1.2rem;font-weight:bold;cursor:pointer;margin:10px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;box-shadow:0 0 15px rgba(255,0,0,0.6);transition:all 0.2s;";
    emergencyBtn.innerHTML =
      '<i class="fa-solid fa-mobile-screen" style="font-size:2rem;"></i><span>' +
      t("d_locate", "LOCATE") +
      '</span><span style="font-size:0.7rem;">' +
      t("d_mobileOnly", "mobile only") +
      "</span>";
    content.appendChild(emergencyBtn);

    function triggerShare() {
      if (isLocked) {
        setStatus(
          t("d_shareLocked", "Share button is locked – unlock to activate."),
          true,
        );
        return;
      }
      if (
        !confirm(
          "📍 " +
            t(
              "d_shareConfirm",
              "Share your location? This will send your current location to your trusted contacts.",
            ),
        )
      ) {
        setStatus(t("d_shareCancelled", "Share cancelled."), false);
        return;
      }
      setStatus(
        t(
          "d_gettingLocation",
          "Getting your location (please allow precise location)...",
        ),
        false,
      );
      if (!navigator.geolocation) {
        setStatus(
          t(
            "d_geolocationUnsupported",
            "Geolocation is not supported by your browser.",
          ),
          true,
        );
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async function (pos) {
          var lat = pos.coords.latitude,
            lon = pos.coords.longitude;
          if (!isPlausibleIrelandLocation(lat, lon)) {
            var proceed = confirm(
              "⚠️ " +
                t("d_locationNotIreland", "The location we received") +
                " (" +
                lat.toFixed(2) +
                ", " +
                lon.toFixed(2) +
                ") " +
                t("d_notIreland", "does not appear to be in Ireland.") +
                "\n" +
                t(
                  "d_impreciseGps",
                  "This may be because your browser could not get a precise GPS fix",
                ) +
                "\n\n" +
                t("d_sendAnyway", "Do you still want to send your location?"),
            );
            if (!proceed) {
              setStatus(
                t(
                  "d_shareCancelledInaccurate",
                  "Share cancelled – location inaccurate.",
                ),
                true,
              );
              return;
            }
          }
          var shortCode = osmShortlink(lat, lon),
            osmShortUrl = "https://osm.org/go/" + shortCode + "?z=16";
          setStatus(
            t("d_sendingTo", "Location obtained. Sending to") +
              " " +
              contacts.length +
              " " +
              t("d_contacts", "contact(s)..."),
            false,
          );
          var successCount = 0,
            failCount = 0;
          for (var i = 0; i < contacts.length; i++) {
            var r = await sendSMS(contacts[i].number, shortCode);
            if (r.success) successCount++;
            else failCount++;
            await new Promise(function (rs) {
              setTimeout(rs, 500);
            });
          }
          if (successCount > 0) {
            setStatus(
              "✅ " +
                t("d_sent", "Location sent to") +
                " " +
                successCount +
                " " +
                t("d_contacts", "contact(s).") +
                (failCount > 0
                  ? " " + t("d_failed", "Failed:") + " " + failCount
                  : ""),
              false,
            );
            var linkDiv = document.createElement("div");
            linkDiv.style.cssText =
              "margin-top:10px;font-size:0.7rem;word-break:break-all;";
            linkDiv.innerHTML =
              '<a href="' +
              osmShortUrl +
              '" target="_blank" style="color:#00ff41;">📍 ' +
              t("d_viewOnOsm", "View shared location on OpenStreetMap") +
              "</a>";
            content.appendChild(linkDiv);
            setTimeout(function () {
              linkDiv.remove();
            }, 15000);
          } else {
            setStatus(
              t(
                "d_sendFailed",
                "Failed to send location. Check network or contact numbers.",
              ),
              true,
            );
          }
        },
        function (error) {
          var em = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              em = t(
                "d_permissionDenied",
                "Location permission denied. Please allow precise location in your browser settings.",
              );
              break;
            case error.POSITION_UNAVAILABLE:
              em = t(
                "d_positionUnavailable",
                "Location information unavailable. Please check your GPS or try again.",
              );
              break;
            case error.TIMEOUT:
              em = t(
                "d_timeout",
                "Location request timed out. Please move to an area with better GPS signal.",
              );
              break;
            default:
              em = t("d_unknownGeoError", "Unknown geolocation error.");
          }
          setStatus(em, true);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    }

    var statusDiv = document.createElement("div");
    statusDiv.style.cssText = "margin-top:20px;font-size:0.8rem;color:#ffb000;";
    content.appendChild(statusDiv);
    function setStatus(msg, isError) {
      if (isError === undefined) isError = false;
      statusDiv.innerHTML =
        '<i class="fa-solid ' +
        (isError ? "fa-exclamation-triangle" : "fa-circle-info") +
        '"></i> ' +
        msg;
      statusDiv.style.color = isError ? "#ff8888" : "#ffb000";
      var m = msg;
      setTimeout(function () {
        if (
          statusDiv.innerHTML ===
          '<i class="fa-solid ' +
            (isError ? "fa-exclamation-triangle" : "fa-circle-info") +
            '"></i> ' +
            m
        )
          statusDiv.innerHTML = "";
      }, 8000);
    }

    emergencyBtn.onclick = triggerShare;
    applyLockState(emergencyBtn);
  }

  render();
  window.addEventListener("storage", function (e) {
    if (e.key === "handiSettings") render();
  });
  window.addEventListener("handiSettingsSaved", function () {
    render();
  });
}
