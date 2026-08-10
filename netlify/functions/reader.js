const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    signal: controller.signal,
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
  }).finally(() => clearTimeout(timer));
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: "invalid url" }),
    };
  }

  try {
    const res = await fetchWithTimeout(targetUrl, 8000);
    if (!res.ok) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: "fetch_failed", status: res.status }),
      };
    }
    const html = await res.text();
    const dom = new JSDOM(html, { url: targetUrl });
    const doc = dom.window.document;
    // 국내 언론사 페이지에 흔한 메뉴/네비게이션이 본문에 섞여 들어오는 걸 막기 위해 먼저 제거
    doc.querySelectorAll("script, style, nav, header, footer, form, iframe, noscript, [role='navigation']").forEach((el) => el.remove());
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.content) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: false, error: "parse_failed" }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        title: article.title || "",
        byline: article.byline || "",
        siteName: article.siteName || "",
        content: article.content,
      }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: "exception", message: String(e && e.message || e) }),
    };
  }
};
