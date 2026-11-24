function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toAbsoluteUrl(rawUrl, origin) {
  const clean = String(rawUrl || "").trim();
  if (!clean) return `${origin}/images/logo.png`;

  try {
    const parsed = new URL(clean, origin);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return `${origin}/images/logo.png`;
  }

  return `${origin}/images/logo.png`;
}

async function loadStoreMetaSettings(db) {
  if (!db) return {};

  try {
    const result = await db
      .prepare(`
        SELECT key, value
        FROM settings
        WHERE key IN ('store_name_ar', 'store_name_en', 'store_logo_url')
      `)
      .all();

    const map = {};
    for (const row of result?.results || []) {
      if (row && row.key) {
        map[row.key] = row.value || "";
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function onRequest(context) {
  const { env, request, next } = context;
  const url = new URL(request.url);

  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return next();
  }

  const response = await next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  try {
    const settings = await loadStoreMetaSettings(env?.DB);

    const nameAr = String(settings.store_name_ar || "").trim();
    const nameEn = String(settings.store_name_en || "").trim();
    const fullTitle = [nameAr, nameEn].filter(Boolean).join(" | ") || "المتجر";
    const description = [nameAr, nameEn].filter(Boolean).join(" - ") || "المتجر";
    const logoUrl = toAbsoluteUrl(settings.store_logo_url, url.origin);

    const safeTitle = escapeHtml(fullTitle);
    const safeDesc = escapeHtml(description);
    const safeLogo = escapeHtml(logoUrl);
    const safeUrl = escapeHtml(`${url.origin}/`);

    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);

    const tags = [
      {
        pattern: /<meta[^>]*name=["']description["'][^>]*>/i,
        replacement: `<meta name="description" content="${safeDesc}">`
      },
      {
        pattern: /<meta[^>]*property=["']og:site_name["'][^>]*>/i,
        replacement: `<meta property="og:site_name" content="${safeTitle}">`
      },
      {
        pattern: /<meta[^>]*property=["']og:title["'][^>]*>/i,
        replacement: `<meta property="og:title" content="${safeTitle}">`
      },
      {
        pattern: /<meta[^>]*property=["']og:description["'][^>]*>/i,
        replacement: `<meta property="og:description" content="${safeDesc}">`
      },
      {
        pattern: /<meta[^>]*property=["']og:image["'][^>]*>/i,
        replacement: `<meta property="og:image" content="${safeLogo}">`
      },
      {
        pattern: /<meta[^>]*property=["']og:url["'][^>]*>/i,
        replacement: `<meta property="og:url" content="${safeUrl}">`
      },
      {
        pattern: /<meta[^>]*name=["']twitter:title["'][^>]*>/i,
        replacement: `<meta name="twitter:title" content="${safeTitle}">`
      },
      {
        pattern: /<meta[^>]*name=["']twitter:description["'][^>]*>/i,
        replacement: `<meta name="twitter:description" content="${safeDesc}">`
      },
      {
        pattern: /<meta[^>]*name=["']twitter:image["'][^>]*>/i,
        replacement: `<meta name="twitter:image" content="${safeLogo}">`
      }
    ];

    for (const item of tags) {
      if (item.pattern.test(html)) {
        html = html.replace(item.pattern, item.replacement);
      } else {
        html = html.replace(/<\/head>/i, `  ${item.replacement}\n</head>`);
      }
    }
  } catch {
    // في حال أي خطأ بالاستعلام، نعيد الصفحة الأصلية بدون تعطيل
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}