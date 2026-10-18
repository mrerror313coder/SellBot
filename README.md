# 🧁 SellBot — Autonomous WhatsApp Sales Agent

> **Production-Grade Agentic Commerce Platform**  
> Built with **Gemma 2 9B**, **Mastra Architecture**, **Baileys (WhatsApp Web API Socket)**, **MongoDB Atlas Vector Search**, **Edge TTS**, and **Sentry Telemetry**.

[![Tests](https://img.shields.io/badge/tests-49%20passed-10b981.svg)]()
[![Model](https://img.shields.io/badge/AI%20Model-Gemma%202%209B-purple.svg)]()
[![Live Demo](https://img.shields.io/badge/demo-live%20on%20render-00b894.svg)](https://sellbot-cdpz.onrender.com)
[![Payments](https://img.shields.io/badge/payments-EasyPaisa%20%7C%20JazzCash%20%7C%20UPI-blue.svg)]()

---

🚀 **Live Interactive Demo**: [https://sellbot-cdpz.onrender.com](https://sellbot-cdpz.onrender.com)  
📦 **GitHub Repository**: [https://github.com/mrerror313coder/SellBot](https://github.com/mrerror313coder/SellBot)

---

## 🌟 Executive Summary

Small to medium e-commerce businesses conduct **60–80% of sales through WhatsApp**, yet lose over 67% of after-hours leads because human teams cannot reply 24/7. Legacy commercial AI solutions rely on rigid decision trees, require expensive monthly overhead, and transmit sensitive customer PII to closed clouds.

**SellBot** is an autonomous, multilingual AI sales agent that lives directly inside WhatsApp. It:
1. **Auto-detects languages** across 6+ languages (Pakistani Roman Urdu, English, Hinglish/Hindi, Spanish, Arabic, Portuguese).
2. **Understands nuanced, localized customer inquiries** (e.g. *"AoA, kal k lye chocolate cake chahye, budget 800"* or *"Kasy hain aap"*).
3. **Gracefully filters out-of-scope inquiries** (e.g. politely clarifying store focus when asked for bikes, electronics, or unrelated items).
4. **Searches catalogs semantically** using 768-dimensional vector embeddings with MongoDB Atlas Vector Search.
5. **Performs live stock checks & price math** with intelligent upsells (complementary candles, gift wraps).
6. **Generates instant localized payment QR codes & instructions** (EasyPaisa, JazzCash, Raast, Cash on Delivery, and UPI) for frictionless checkout.
7. **Autonomously schedules post-purchase follow-ups** (T+1d, T+7d, T+30d) via background `node-cron`.
8. **Includes an Admin Dashboard** and **Interactive WhatsApp Web Simulator** for testing in real-time.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CUSTOMER DEVICES                      │
│            WhatsApp Mobile  •  WhatsApp Desktop             │
└──────────────────────────────┬──────────────────────────────┘
                                │ (QR Scan / WebSockets)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    WHATSAPP SOCKET LAYER                    │
│         Baileys (Direct WhatsApp Web API Socket)            │
│      • Direct socket connection • Typing delays & anti-ban  │
└──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS & MASTRA AGENT                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Orchestrator Agent                                     │ │
│  │ ├─ Language Detector (ur, en, hi-en, hi, es, ar, pt)   │ │
│  │ ├─ Intent Classifier (browse, compare, buy, complain,  │ │
│  │ │                     out_of_scope, greeting)          │ │
│  │ ├─ Catalog Search (Atlas 768-dim Vector Search)        │ │
│  │ ├─ Inventory Check (Real-time stock verification)      │ │
│  │ ├─ Price Calculator (Cart math, discounts, shipping)   │ │
│  │ ├─ Payment QR Tool (EasyPaisa, JazzCash, Raast, UPI)   │ │
│  │ ├─ Order Creator & Follow-Up Scheduler (node-cron)     │ │
│  │ └─ Voice TTS (Edge TTS Neural Voices)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      AI INFERENCE LAYER      │ │        MEMORY LAYER        │
│ • Primary: Gemma 2 9B (Groq) │ │ • MongoDB Atlas Vector     │
│   Ultra-fast token streaming │ │   Products, Conversations, │
│ • Backup: Ollama Gemma 2 2B  │ │   Customers, Orders        │
│ • Telemetry: Sentry Tracing  │ │ • Local Resilient JSON DB  │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Capability |
|---|---|---|
| **AI Inference** | Gemma 2 9B via Groq | High-throughput open model inference (~500 tokens/sec) |
| **Local AI Backup** | Gemma 2 2B via Ollama | Offline fallback for local and on-premise deployments |
| **WhatsApp Layer** | Baileys (`@whiskeysockets/baileys`) | Direct WhatsApp socket connection with device pairing |
| **Database & Vector Search** | MongoDB Atlas / Local Resilient DB | 768-dim vector embeddings + multi-turn customer memory |
| **Voice Synthesis** | Edge TTS (Neural Voices) | High-fidelity neural voice synthesis across 40+ languages |
| **Payments** | EasyPaisa, JazzCash, Raast, COD, UPI QR | Multi-region localized checkout & payment links |
| **Scheduling** | `node-cron` | Autonomous post-purchase follow-up engine |
| **Tracing** | Sentry SDK | Distributed error reporting, latency tracing, and telemetry |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20 and v24)
- **Git**

### 2. Installation
```bash
git clone https://github.com/mrerror313coder/SellBot.git
cd sellbot
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(SellBot includes intelligent fallback engines so you can run the server and test immediately even before obtaining keys).*

Key variables:
- `GROQ_API_KEY`: Get a free key at [console.groq.com](https://console.groq.com)
- `GROQ_MODEL`: `gemma2-9b-it`
- `MONGODB_URI`: Your MongoDB Atlas connection URI (optional; falls back to embedded local DB)
- `STORE_NAME`: `Priya's Cakes`
- `STORE_UPI`: `priya@paytm`
- `STORE_CURRENCY`: `INR`

### 4. Seed 50 Products with 768-dim Embeddings
```bash
npm run seed
```

### 5. Run the Test Suite
```bash
npm test
```
Runs 38 unit & integration tests covering language detection, intent classification, cart math, UPI QR generation, multi-turn agent response, and anti-ban rate limiting.

### 6. Start the Server & Admin Dashboard
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser!

---

## 📱 Features & Walkthrough

### 1. Overview Dashboard (`/`)
- Live stat counters: Chats Today, Response Rate (94%), Revenue Today, Avg Response Time (3.1s).
- Live Telemetry: Gemma 2 9B token speed, tool call counter, Sentry error tracker, daily Groq budget quota.
- Recent conversations list with status pills (*Active*, *Sold*, *Escalated*).

### 2. Conversations Inspector (`#conversations`)
- Browse all customer chats with status filters.
- Inspect complete multi-turn message transcripts.
- **Agent Decision Trace Drawer**: View exact intent classified, extracted entities (budget, recipient), tools executed, tokens used, and latency in milliseconds.
- Change status or trigger human handoff.

### 3. Catalog Management (`#catalog`)
- Browse 50 seeded SKUs (cakes, pastries, cupcakes, hampers, cookies, candles).
- Real-time stock status pills (*In Stock*, *Low Stock*).
- **Upload CSV**: Upload custom CSV catalogs and auto-generate 768-dimensional vector embeddings on the fly.
- Add products manually via modal.

### 4. Interactive WhatsApp Live Simulator (`#simulator`)
- Photorealistic WhatsApp Web interface.
- Test queries in **Pakistani Roman Urdu**, **English**, **Hinglish/Hindi**, **Spanish**, **Arabic**, and **Portuguese**.
- Try quick prompts:
  - 🇵🇰 *"Kasy hain aap?"* (Polite local greeting)
  - 🇵🇰 *"AoA, kal k lye chocolate cake chahye, budget 800"* (Pakistani ordering flow)
  - 🇵🇰 *"EasyPaisa ya Cash on delivery chalega?"* (Local payment inquiry)
  - 🏍️ *"Mujhy bike leni hai"* (Out-of-scope inquiry handling)
  - *"I need a gift for my mom, budget 500"*
  - *"Eggless options?"*
- Live typing indicator (`SellBot is typing...`).
- Generates scan-ready payment QR codes and EasyPaisa/JazzCash/UPI instructions right in the chat!

### 5. Baileys Phone QR Pairing (`#pairing`)
- To pair any smartphone WhatsApp account, visit the **QR Pairing** tab.
- Click **"Generate / Refresh QR Code"** and scan the QR with your phone's WhatsApp (*Linked Devices*).
- The credentials are encrypted and stored in `./auth/baileys-session` for automatic reconnection.

---

## 🛡️ Anti-Ban & Privacy Architecture

- **Human Typing Delays**: Simulates typing presence for 1.2–1.8 seconds before sending replies.
- **Message Throttling**: Strict 2-second rate-limiting per customer and maximum 50 messages/hour.
- **Strict Data Residency**: Zero customer PII (names, phone numbers, addresses, transaction IDs) is ever transmitted to closed third parties. All data resides in your own MongoDB database.

---

## 📜 License

MIT License. Developed for Hacktoberfest 2026.
