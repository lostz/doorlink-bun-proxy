# Doorlink Bun Proxy

一个极简的 Bun + Hono 开门代理服务。公网客户端只调用本服务，本服务在内网里转发到 Doorlink 设备的 `:8080/` 接口。

## 接口

```http
POST /open-door
Authorization: Bearer <OPEN_DOOR_TOKEN>
```

服务内部会转发：

```http
POST http://<doorlink-host>:8080/
Content-Type: application/x-www-form-urlencoded

from=<DOORLINK_FROM>&to=<DOORLINK_TO>&event=unlock&family=1&elev=0&direct=1
```

健康检查：

```http
GET /health
```

## 本地运行

```bash
cp .env.example .env
bun install
bun run dev
```

测试：

```bash
curl -X POST "http://127.0.0.1:3000/open-door" \
  -H "Authorization: Bearer change-me"
```

## Docker

```bash
docker build -t doorlink-bun-proxy .
docker run --rm -p 3000:3000 --env-file .env doorlink-bun-proxy
```

## iOS 快捷指令

使用「获取 URL 内容」：

- URL: `https://你的域名/open-door`
- 方法: `POST`
- 请求头: `Authorization: Bearer <OPEN_DOOR_TOKEN>`
- 请求体: 可留空

## 环境变量

| 名称 | 必填 | 说明 |
| --- | --- | --- |
| `PORT` | 否 | 服务监听端口，默认 `3000` |
| `OPEN_DOOR_TOKEN` | 是 | 调用 `/open-door` 的 Bearer token |
| `DOORLINK_URL` | 是 | Doorlink 设备地址，例如 `http://192.168.161.61:8080/` |
| `DOORLINK_FROM` | 是 | 室内机 SIP，例如 `1-160106010@192.168.161.61:14301` |
| `DOORLINK_TO` | 否 | 目标 SIP，例如 `160100000@192.168.161.1:14301` |
| `DOORLINK_FAMILY` | 否 | 默认 `1` |
| `DOORLINK_TIMEOUT_MS` | 否 | 请求 Doorlink 超时时间，默认 `3000` |
