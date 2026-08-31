export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleSubmit(request, env) {
  try {
    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY is not configured." }, 500);
    }

    if (!env.RECIPIENT_EMAILS) {
      return jsonResponse({ error: "RECIPIENT_EMAILS is not configured." }, 500);
    }

    const recipients = env.RECIPIENT_EMAILS
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return jsonResponse({ error: "RECIPIENT_EMAILS does not contain any addresses." }, 500);
    }

    const data = await request.json();

    const vehicleNumber =
      typeof data.vehicleNumber === "string" && data.vehicleNumber.trim()
        ? data.vehicleNumber.trim().toUpperCase()
        : "Не вказано";

    const hasLocation =
      Number.isFinite(data.latitude) && Number.isFinite(data.longitude);

    const mapUrl = hasLocation
      ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
      : null;

    const accuracy =
      hasLocation && Number.isFinite(data.accuracy)
        ? `${Math.round(data.accuracy)} м`
        : "Не вказано";

    const locationStatusLabels = {
      provided: "Надано",
      permission_denied: "Користувач не дозволив доступ",
      position_unavailable: "Геолокація недоступна",
      timeout: "Не вдалося отримати вчасно",
      not_supported: "Браузер не підтримує геолокацію",
      unknown_error: "Невідома помилка",
    };

    const locationStatus =
      locationStatusLabels[data.locationStatus] || "Не вказано";

    const submittedAt = new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    const subject =
      vehicleNumber !== "Не вказано"
        ? `Нове повідомлення — ${vehicleNumber}`
        : "Нове повідомлення";

    const html = `
      <h2>Нове повідомлення</h2>
      <p><strong>Номер автівки:</strong> ${escapeHtml(vehicleNumber)}</p>
      <p><strong>Геолокація:</strong> ${escapeHtml(locationStatus)}</p>
      ${
        mapUrl
          ? `<p><strong>Карта:</strong> <a href="${mapUrl}">Відкрити в Google Maps</a></p>
             <p><strong>Координати:</strong> ${data.latitude}, ${data.longitude}</p>
             <p><strong>Точність:</strong> приблизно ${escapeHtml(accuracy)}</p>`
          : ""
      }
      <p><strong>Дата та час:</strong> ${escapeHtml(submittedAt)}</p>
    `;

    const fromAddress =
      env.FROM_EMAIL || "Vehicle Report <onboarding@resend.dev>";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return jsonResponse(
        {
          error: "Email service rejected the request.",
          resendError: resendResult,
        },
        502
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error("Submit error:", error);
    return jsonResponse({ error: "Unexpected server error." }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
