# Keyless Account Configuration

## Google OAuth Setup

To enable keyless accounts, you need to configure Google OAuth:

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable "Google+ API"

### 2. Create OAuth 2.0 Client ID

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
5. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

### 3. Get Client ID

Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### 4. Update `.env.local`

```bash
# Add this to your .env.local file
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## Environment Variables Reference

```bash
# .env.local

# ===== Existing Configuration

 =====
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_PAYMENT_RECIPIENT=your-aptos-address
OPENAI_API_KEY=your-openai-key

# ===== NEW: Keyless Accounts =====

# Google OAuth Client ID (REQUIRED)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Aptos Keyless Configuration (optional - defaults provided)
NEXT_PUBLIC_KEYLESS_PROVER_URL=https://prover.devnet.aptoslabs.com
NEXT_PUBLIC_KEYLESS_PEPPER_URL=https://pepper.devnet.aptoslabs.com/v0/pepper

# Delegation Session Configuration (optional)
NEXT_PUBLIC_SESSION_MAX_REQUESTS=10
NEXT_PUBLIC_SESSION_DURATION=3600000  # 1 hour in milliseconds
```

---

## Testing Keyless Accounts

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Login with Google

1. Go to http://localhost:3000
2. Click "Login with Google"
3. Authorize the app
4. Your keyless account will be created!

### 3. Create Delegation Session

```bash
# In browser console:
const { createDelegationSession } = useKeyless();
await createDelegationSession();
```

This creates a session for **10 autonomous payments** - no wallet popups!

### 4. Execute Agent (Autonomous Payment)

1. Navigate to any agent
2. Click "EXECUTE WITH x402"
3. Payment will be signed AUTOMATICALLY (no popup!)
4. Check console: "Transaction signed autonomously!"

---

## How It Works

### Traditional Flow (Petra Wallet)
```
User clicks "Pay" → Wallet popup → User confirms → Transaction signed
```

### Keyless Flow (AIP-61)
```
User logs in with Google (once) → Creates delegation session (10 txns) → 
Agent executes → Payment auto-signed (NO POPUP!) → Repeat 10x
```

### Benefits
✅ No wallet extension required
✅ No seed phrases to manage
✅ No popups for approved actions
✅ Autonomous agent behavior
✅ Works on any device (even mobile!)

---

## Security Notes

### What's Secure
- ✅ ZK proofs prevent JWT replay attacks
- ✅ Ephemeral keys never leave client
- ✅ Sessions auto-expire
- ✅ Limited scope (x402 payments only)
- ✅ User can revoke anytime

### What to Watch
- ⚠️ Session keys stored in localStorage (use secure context)
- ⚠️ 10-transaction limit prevents unlimited spending
- ⚠️ Always use HTTPS in production
- ⚠️ Clear sessions on logout

---

## Troubleshooting

### "No Google Client ID found"
→ Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `.env.local`

### "Redirect URI mismatch"
→ Check authorized URIs in Google Cloud Console match exactly

### "Failed to fetch pepper"
→ Network error - check internet connection

### "Session expired"
→ Create new delegation session (max 1 hour lifetime)

---

## Production Deployment

### Update Redirect URIs
1. Add production domain to Google Cloud Console
2. Update `.env.production`:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=same-client-id
NEXT_PUBLIC_APTOS_NETWORK=mainnet  # Switch to mainnet!
```

### Deploy
```bash
npm run build
npm start
```

Your keyless accounts will work on production!
