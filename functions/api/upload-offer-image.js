const GITHUB_OWNER = "monqezaleskaf";
const GITHUB_REPO = "elsaadany";
const GITHUB_BRANCH = "main";

export async function onRequestPost({ request, env }) {
  try {
    const adminPassword = env?.ADMIN_PASSWORD;
    const providedPassword = request.headers.get("X-Admin-Password") || "";

    if (adminPassword && providedPassword !== adminPassword) {
      return jsonResponse({ ok: false, error: "غير مصرح لك بالوصول" }, 401);
    }

    const githubToken = env?.GITHUB_TOKEN;
    if (!githubToken) {
      return jsonResponse(
        { ok: false, error: "متغير البيئة GITHUB_TOKEN غير مضبوط" },
        500
      );
    }

    const body = await request.json().catch(() => null);
    const offerId = String(body?.offer_id || "").trim();
    const rawBase64 = String(body?.image_base64 || "").trim();
    const imageBase64 = rawBase64.includes(",") ? rawBase64.split(",").pop().trim() : rawBase64;

    if (!offerId || !/^[a-zA-Z0-9_-]+$/.test(offerId)) {
      return jsonResponse({ ok: false, error: "معرّف العرض غير صالح" }, 400);
    }

    if (!imageBase64) {
      return jsonResponse({ ok: false, error: "بيانات الصورة غير موجودة" }, 400);
    }

    const filePath = `offers/${offerId}.png`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const commonHeaders = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "Cloudflare-Pages-Offer-Uploader"
    };

    let existingSha = null;
    const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
      method: "GET",
      headers: commonHeaders
    });

    if (checkRes.ok) {
      const checkData = await checkRes.json().catch(() => null);
      existingSha = checkData?.sha || null;
    }

    const payload = {
      message: `chore: update offer grid image for offer #${offerId}`,
      content: imageBase64,
      branch: GITHUB_BRANCH
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    const uploadRes = await fetch(apiUrl, {
      method: "PUT",
      headers: commonHeaders,
      body: JSON.stringify(payload)
    });

    const uploadData = await uploadRes.json().catch(() => ({}));

    if (!uploadRes.ok) {
      return jsonResponse(
        {
          ok: false,
          error: uploadData?.message || "تعذر رفع صورة العرض إلى المستودع",
          github_status: uploadRes.status
        },
        500
      );
    }

    return jsonResponse({
      ok: true,
      path: filePath,
      commit: uploadData?.commit?.sha || null
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: "حدث خطأ أثناء رفع صورة العرض: " + (err?.message || "") },
      500
    );
  }
}

export async function onRequest() {
  return jsonResponse({ ok: false, error: "طريقة الطلب غير مسموحة" }, 405);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}