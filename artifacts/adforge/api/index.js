// Placeholder overwritten by build:vercel (esbuild of Express app).
// Must exist in git so Vercel registers /api as a Serverless Function.
module.exports = (req, res) => {
  res.statusCode = 503;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "API bundle not built yet" }));
};
