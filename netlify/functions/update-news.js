const { getStore } = require("@netlify/blobs");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

function validate(data) {
  const errors = [];
  if (typeof data !== "object" || data === null) return ["body must be a JSON object"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) errors.push("date must be YYYY-MM-DD");
  if (typeof data.greeting !== "string" || !data.greeting) errors.push("greeting must be a non-empty string");
  if (!Array.isArray(data.articles) || data.articles.length < 3 || data.articles.length > 10) {
    errors.push("articles must be an array of 3~10 items");
    return errors;
  }
  data.articles.forEach((a, i) => {
    const p = `articles[${i}]`;
    if (typeof a.id !== "string" || !a.id) errors.push(`${p}.id missing`);
    if (typeof a.category !== "string" || !a.category) errors.push(`${p}.category missing`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(a.categoryColor || "")) errors.push(`${p}.categoryColor must be a hex color`);
    if (typeof a.emoji !== "string" || !a.emoji) errors.push(`${p}.emoji missing`);
    if (!["쉬움", "보통", "어려움"].includes(a.difficulty)) errors.push(`${p}.difficulty must be 쉬움/보통/어려움`);
    if (typeof a.title !== "string" || !a.title) errors.push(`${p}.title missing`);
    if (!Array.isArray(a.summary) || a.summary.length < 2) errors.push(`${p}.summary must be an array of 2+ strings`);
    if (!a.word || typeof a.word.term !== "string" || typeof a.word.explain !== "string") errors.push(`${p}.word.term/explain missing`);
    if (!a.quiz || typeof a.quiz.question !== "string" || !["O", "X"].includes(a.quiz.answer) || typeof a.quiz.explain !== "string") {
      errors.push(`${p}.quiz malformed (question/answer O-X/explain required)`);
    }
    if (typeof a.kongi !== "string" || !a.kongi) errors.push(`${p}.kongi missing`);
    if (!a.source || typeof a.source.url !== "string" || !/^https?:\/\//.test(a.source.url)) {
      errors.push(`${p}.source.url must be a valid http(s) URL`);
    }
  });
  return errors;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "POST only" }) };
  }

  const key = event.headers["x-update-key"] || event.headers["X-Update-Key"];
  if (!process.env.UPDATE_SECRET || key !== process.env.UPDATE_SECRET) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: "unauthorized" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "invalid JSON body" }) };
  }

  const errors = validate(data);
  if (errors.length > 0) {
    return { statusCode: 422, headers: CORS_HEADERS, body: JSON.stringify({ error: "validation failed", details: errors }) };
  }

  const store = getStore("kongkong-news");
  await store.setJSON("news", data);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: true, date: data.date, articles: data.articles.length }),
  };
};
