const { getStore } = require("@netlify/blobs");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const store = getStore("kongkong-news");
  const data = await store.get("news", { type: "json" });

  if (!data) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "no news data yet" }),
    };
  }

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(data) };
};
