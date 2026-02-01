# 🚀 Vercel Deployment Guide

Since your code is now on GitHub, follow these 3 simple phases.

## Phase 1: Connect to Vercel
1.  Go to [https://vercel.com/new](https://vercel.com/new).
2.  Select your GitHub repository: **`mardromus/NeuralGrid`**.
3.  Click **Import**.

## Phase 2: Configure Environment Variables (Vercel)
On the "Configure Project" screen, look for **Environment Variables**. You must add these manually.
*Open your local `.env.local` to copy the headers.*

| Variable Name | Value Description |
| :--- | :--- |
| `NEXT_PUBLIC_APTOS_NETWORK` | `testnet` |
| `NEXT_PUBLIC_PAYMENT_RECIPIENT` | Copy from your local .env (The 0x... address) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Copy from your local .env (The 580... google id) |
| `GROQ_API_KEY` | Copy from your local .env (The gsk_... key) |

> **⚠️ IMPORTANT**: Do NOT paste the `GROQ_API_KEY` into any committed file. Only paste it into the Vercel Dashboard!

## Phase 3: Update Google Cloud Console (The Redirect Fix)
After you click **Deploy**, Vercel will give you a domain (e.g., `https://neural-grid.vercel.app`).

**Login will fail if you don't do this:**
1.  Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2.  Edit your OAuth 2.0 Client.
3.  **Authorized JavaScript origins**: Add your new Vercel domain (e.g., `https://neural-grid.vercel.app`).
4.  **Authorized redirect URIs**: Add your new Vercel domain (e.g., `https://neural-grid.vercel.app`).
5.  Save and wait ~2 minutes.

## Troubleshooting
- If the build fails on Vercel, check the "Logs".
- If "Login with Google" fails, it's 100% the Google Cloud Console settings (Phase 3).
