# my-proxy-server

把本机收到的 HTTP 请求转发到 `https://api.openai.com` 的最小 Node.js 反向代理。

[![Node.js](https://img.shields.io/badge/Node.js-%5E14.15%20%7C%7C%20%5E16.10%20%7C%7C%20%3E%3D18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![http-proxy-middleware](https://img.shields.io/badge/http--proxy--middleware-3.0.0-blue)](https://github.com/chimurai/http-proxy-middleware)

## 简介

整个服务写在 `index.js` 里。Express 监听固定端口，`http-proxy-middleware` 把挂在 `/` 上的请求转到 OpenAI 官方 API。端口和上游地址都是源码常量，程序不读取环境变量，也没有配置文件或命令行参数。

本机客户端可以把 OpenAI 的接口基址换成 `http://127.0.0.1:13140`。API Key 由调用方放在请求的 `Authorization` 头里；这个进程不保存、也不追加密钥。

## 现有行为

| 项目 | 源码中的值 |
| --- | --- |
| 监听端口 | `13140` |
| 代理挂载路径 | `/`（该路径下的请求都会进入代理） |
| 上游 | `https://api.openai.com` |
| `changeOrigin` | `true`（将 `Host` 改成上游主机名） |

`app.listen(13140)` 不指定主机名。在本次验证环境中，进程监听 `:::13140`，通过 `http://127.0.0.1:13140` 可以访问。

中间件会把方法、路径、查询字符串、请求头（包括 `Authorization`）和请求体交给上游。源码里没有 `pathRewrite`，也没有设置 `ws`，因此这里没有路径改写，也没有启用 WebSocket 代理。

`index.js` 中的 `onProxyReq` 打算在转发前打印 `Proxying request to: ...`。已安装的 `http-proxy-middleware@3.0.0` 里，`createProxyMiddleware` 注册的是 `on.proxyReq`。`onProxyReq` 是旧版字段，当前这段写法不会挂上该回调。验证时请求已经到达 OpenAI，控制台没有出现这行日志。

在 Node.js v22 上处理请求时，依赖会触发弃用警告 `DEP0060`（`util._extend`）。警告出现后进程仍继续提供代理。

## 技术栈与依赖版本

| 依赖 | `package.json` 范围 | 锁文件与已提交 `node_modules` |
| --- | --- | --- |
| express | `^4.19.2` | **4.19.2** |
| http-proxy-middleware | `^3.0.0` | **3.0.0** |

- 模块格式是 CommonJS（`require`）。
- `http-proxy-middleware@3.0.0` 声明的 Node.js 引擎为 `^14.15.0 || ^16.10.0 || >=18.0.0`。
- 本文的启动与请求验证使用 **Node.js v22.23.4**、**npm 10.9.9**。
- `package.json` 的 `license` 字段是 `ISC`。仓库中没有单独的 `LICENSE` 文件。
- `author`、`description`、`keywords` 均为空。

## 目录结构

```text
.
├── index.js            # 代理入口：端口、上游、中间件
├── package.json        # 包信息与依赖范围；test 脚本是占位命令
├── package-lock.json   # 锁定 express 4.19.2 与 http-proxy-middleware 3.0.0
├── node_modules/       # 已纳入版本库，克隆后可直接启动
└── README.md
```

仓库里没有测试代码。`npm test` 会执行占位脚本，打印 `Error: no test specified`，并以退出码 1 结束。这一行为已在本环境执行确认。

## 环境要求

- Node.js 满足 `^14.15.0 || ^16.10.0 || >=18.0.0`。本文验证版本是 v22.23.4。
- 运行代理的机器能够访问 `https://api.openai.com`。

## 安装与运行

`package.json` 没有 `start` 脚本。启动命令是 `node index.js`。

### 使用仓库里已有的依赖（已验证）

`node_modules` 已提交。在仓库根目录执行：

```bash
node index.js
```

成功时打印：

```text
Proxy server is running on http://localhost:13140
```

另开终端访问模型列表。不携带密钥时，上游返回 **401**，正文为缺少 Bearer 认证：

```bash
curl -i http://127.0.0.1:13140/v1/models
```

携带自己的密钥：

```bash
curl -i http://127.0.0.1:13140/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

本次用一枚无效 Bearer token 请求了同一路径，上游返回 **401**，错误码为 `invalid_api_key`。这说明 `Authorization` 被转发到了 OpenAI。验证没有使用可用密钥，因此没有完成一次成功的模型列表调用。

`GET /` 也会被转发。本次环境中该请求的 HTTP 状态是 **421**，响应体是 OpenAI 的欢迎信息，其中给出的文档地址为 <https://platform.openai.com/docs/api-reference>。

在运行 `node index.js` 的终端按 `Ctrl+C` 结束进程。

### 重新安装依赖

`package-lock.json` 中的 tarball 地址形如 `http://registry.npm.release.ctripcorp.com/...`。本环境无法解析该域名（`ENOTFOUND`）。带着这份锁文件执行 `npm install` 时，下载重试后失败，依赖没有装完。

要在公共 npm 源装回与仓库一致的版本，在空目录执行下面的命令。该命令已在临时目录验证，安装结果为 express **4.19.2**、http-proxy-middleware **3.0.0**：

```bash
npm install express@4.19.2 http-proxy-middleware@3.0.0
```

若只按 `package.json` 的范围安装、不使用这份锁文件，公共源会解析到更新的兼容版本。本次临时目录中的结果是 express **4.22.3**、http-proxy-middleware **3.0.11**。上文的请求验证对应仓库已提交的 **4.19.2 / 3.0.0**。

## 修改端口或上游

编辑 `index.js` 中的 `PORT` 或 `targetUrl`，保存后重新执行 `node index.js`。

## 备注

进程监听所有网卡（`:::13140`）。能访问该端口的客户端都可以把请求转到 OpenAI，用量记在请求自带的 API Key 上。只给本机用时，用防火墙限制来源，并从 `127.0.0.1` 访问。程序本身不做鉴权或限流。

仓库中没有界面，也没有可引用的截图。

## 参考

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Express](https://expressjs.com/)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
