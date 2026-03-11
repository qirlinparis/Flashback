# Production Deployment Guide

Server: root@104.236.27.211 (My-memory, Fedora 43)
Domain: qirlinparis.codes (Name.com)
App: /opt/flashback/

## Current state (as of March 11, 2026 — fully deployed)
- [x] Repo cloned, .env created, pip install done
- [x] API confirmed starts with `python3 -m src.api`
- [x] systemd service
- [x] nginx reverse proxy
- [x] SSL certificate (certbot)
- [x] DNS A record
- [x] Widget URL updated

---

## Step 1 — systemd service

Pull the service file from the repo, install it, and start it.

```bash
# On the server (ssh root@104.236.27.211)
cp /opt/flashback/deploy/flashback.service /etc/systemd/system/flashback.service
systemctl daemon-reload
systemctl enable flashback
systemctl start flashback
systemctl status flashback
```

You should see `Active: active (running)`. The API now runs forever, survives reboots, restarts on crash.

To read logs: `journalctl -u flashback -f`

---

## Step 2 — nginx reverse proxy

```bash
# On the server
cp /opt/flashback/deploy/nginx.conf /etc/nginx/conf.d/flashback.conf
nginx -t
systemctl enable nginx
systemctl start nginx
```

`nginx -t` tests the config before applying. If it says "syntax is ok" and "test is successful" you're clear.

At this point: http://104.236.27.211 should return your API (not HTTPS yet, no domain yet).

---

## Step 3 — SSL certificate (certbot / Let's Encrypt)

```bash
# On the server
dnf install -y certbot python3-certbot-nginx
certbot --nginx -d qirlinparis.codes
```

certbot will:
1. Verify you own the domain (by placing a file at /.well-known/ and checking it via DNS)
2. Obtain a certificate from Let's Encrypt
3. Automatically update your nginx.conf to add HTTPS (port 443) and redirect HTTP → HTTPS

**This step requires Step 4 (DNS) to be done first.** certbot can't verify domain ownership until the domain points to your server.

---

## Step 4 — DNS A record (Name.com)

Do this at Name.com DNS management:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 104.236.27.211 | 300 |

`@` means the root domain (qirlinparis.codes itself, not www.).
TTL 300 = 5 minutes before the record propagates globally.

After adding: wait ~5 minutes, then run `ping qirlinparis.codes` from your local machine — you should see replies from 104.236.27.211.

Then go back and run Step 3.

---

## Step 5 — Update Scriptable widget

In `clients/scriptable/flashback.js`, change:

```js
const API_URL = "http://192.168.x.x:8000"  // old local IP
```

to:

```js
const API_URL = "https://qirlinparis.codes"
```

Then redeploy the widget to your iPhone.

---

## Step 6 — End-to-end test

```bash
# From your local machine
curl https://qirlinparis.codes/health
# Should return: {"status": "ok"}

# Register your Telegram user
curl -X POST https://qirlinparis.codes/register \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": YOUR_TELEGRAM_ID}'
```

Then send a message to your Telegram bot. Check the Scriptable widget surfaces it.

---

## Order matters

DNS must be done before certbot.
certbot must be done before the widget URL update (you need HTTPS).
systemd and nginx can be done in any order before DNS.
