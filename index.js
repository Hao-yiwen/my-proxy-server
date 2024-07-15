const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 13140;

// 目标域名
const targetUrl = "https://api.openai.com";

// 创建代理中间件
app.use(
  "/",
  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying request to: ${targetUrl}${req.originalUrl}`);
    },
  })
);

app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
});
