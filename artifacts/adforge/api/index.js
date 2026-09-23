// Placeholder overwritten by build:api (esbuild of Express app).
module.exports = function (req, res) {
  res.statusCode = 503;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "API bundle not built yet" }));
};
