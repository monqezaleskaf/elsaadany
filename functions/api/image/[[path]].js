const GITHUB_OWNER = "monqezaleskaf";
const GITHUB_REPO = "tsf";
const GITHUB_BRANCH = "main";

export async function onRequestGet({ params }) {
  try {
    const pathParts = params.path;

    if (!Array.isArray(pathParts) || pathParts.length === 0) {
      return imageError("مسار الصورة غير صالح", 400);
    }

    const joinedPath = pathParts.join("/");
    let targetPath;
    let expectedMime;

    if (
      joinedPath === "Logo.png" ||
      joinedPath === "public/images/Logo.png" ||
      joinedPath === "store/Logo.png" ||
      joinedPath === "Watermark.png" ||
      joinedPath === "public/images/Watermark.png" ||
      joinedPath === "store/Watermark.png"
    ) {
      targetPath = joinedPath;
      expectedMime = "image/png";
    } else if (
      pathParts.length === 1 &&
      pathParts[0].endsWith(".webp")
    ) {
      const productId = pathParts[0].slice(0, -5);
      if (!productId || productId === "." || productId === "..") {
        return imageError("معرّف المنتج غير صالح", 400);
      }
      targetPath = pathParts[0];
      expectedMime = "image/webp";
    } else if (
      pathParts.length === 2 &&
      pathParts[0] === "products" &&
      pathParts[1].endsWith(".webp")
    ) {
      const productId = pathParts[1].slice(0, -5);
      if (!productId || productId === "." || productId === "..") {
        return imageError("معرّف المنتج غير صالح", 400);
      }
      targetPath = `products/${pathParts[1]}`;
      expectedMime = "image/webp";
    } else {
      return imageError("مسار الصورة غير مسموح", 404);
    }

    const encodedPath = targetPath
      .split("/")
      .map(segment => encodeURIComponent(segment))
      .join("/");

    const githubImageUrl =
      `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodedPath}`;

    const upstreamResponse = await fetch(githubImageUrl, {
      method: "GET"
    });

    if (!upstreamResponse.ok) {
      return imageError(
        upstreamResponse.status === 404
          ? "الصورة غير موجودة"
          : "تعذر جلب الصورة من مستودع الصور",
        upstreamResponse.status === 404 ? 404 : 502
      );
    }

    const contentType = (
      upstreamResponse.headers.get("Content-Type") || ""
    ).split(";")[0].trim().toLowerCase();

    if (contentType !== expectedMime) {
      return imageError("نوع الصورة المسترجعة غير متوقع", 502);
    }

    const headers = new Headers();
    headers.set("Content-Type", expectedMime);
    headers.set("Cache-Control", "no-cache");
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = upstreamResponse.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers
    });
  } catch (error) {
    return imageError(
      "حدث خطأ أثناء عرض الصورة: " + (error?.message || ""),
      500
    );
  }
}

export async function onRequest({ request }) {
  if (request.method === "GET") {
    return imageError("حدث خطأ في معالجة طلب الصورة", 500);
  }

  return imageError("طريقة الطلب غير مسموحة", 405);
}

function imageError(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
