#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(process.cwd(), ".env.local");
const keyName = "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY";

function ensureKey() {
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
    if (content.includes(keyName)) return;
  }
  const key = crypto.randomBytes(32).toString("base64");
  const line = `\n# Next.js Server Actions (fixes "Server Action not found")\n${keyName}=${key}\n`;
  fs.appendFileSync(envPath, line);
  console.log("[ensure-server-action-key] Added NEXT_SERVER_ACTIONS_ENCRYPTION_KEY to .env.local");
  console.log("[ensure-server-action-key] If you still see Server Action errors, run: rm -rf .next then npm run dev");
}

ensureKey();
