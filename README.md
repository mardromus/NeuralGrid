# Aether x402: The Neural Marketplace

Production-ready AI agent marketplace with **real x402 micropayments** on Aptos blockchain.

## 🚀 What This Is

A fully functional pay-per-use AI agent marketplace featuring:
- **Real AI Execution**: DALL-E 3 for image generation, GPT-4 for code audits, live financial data
- **x402 Payments**: True HTTP 402 protocol implementation with Aptos blockchain
- **Transaction History**: Track all payments and agent executions
- **Production Ready**: Error handling, TypeScript, proper architecture

## 🎯 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys

Create or update `.env.local` with your OpenAI API key:
```bash
# Required for real AI agent execution
OPENAI_API_KEY=sk-your-openai-api-key-here

# Your Aptos treasury address (receives payments)
NEXT_PUBLIC_PAYMENT_RECIPIENT=your-aptos-address-here
```

**Get an OpenAI API key**: https://platform.openai.com/api-keys

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Connect Petra Wallet

1. Install [Petra Wallet](https://petra.app/) browser extension
2. Switch to Aptos Testnet
3. Get testnet APT from [faucet](https://aptoslabs.com/testnet-faucet)

### 5. Execute an Agent

1. Browse agents on the homepage
2. Click any agent to view details
3. Click "EXECUTE WITH x402"
4. Authorize payment in Petra wallet
5. Get real AI results in seconds!

## 🤖 Available Agents

### VORTEX RENDERER (0.25 APT)
- **Type**: Image Generation
- **AI Model**: DALL-E 3
- **Input**: Text prompt describing desired image
- **Output**: High-quality 1024x1024 generated image

### SENTINEL AUDITOR (0.15 APT)
- **Type**: Code Analysis
- **AI Model**: GPT-4 Turbo
- **Input**: Code snippet to audit
- **Output**: Security analysis, vulnerabilities, suggestions

### ORACLE ANALYTICS (0.08 APT)
- **Type**: Financial Data
- **API**: CoinGecko (free, no key needed)
- **Input**: Cryptocurrency symbol (e.g., "bitcoin")
- **Output**: Live price, market cap, 24h change, volume

## 💡 How It works

### x402 Payment Protocol Flow

```
User clicks "Execute"
    ↓
API returns 402 Payment Required
    ↓
User authorizes payment via Petra Wallet
    ↓
Transaction submitted to Aptos blockchain
    ↓
Facilitator verifies payment (sub-second)
    ↓
Agent executes real AI task
    ↓
Result returned + Transaction saved to history
```

### Real AI Integration

- **Image Generation**: OpenAI DALL-E 3 API
- **Code Audit**: OpenAI GPT-4 Turbo with JSON output
- **Financial Data**: CoinGecko public API (no key required)

All responses are **real, not mocked**!

## 📊 Transaction History

All your payments and results are automatically saved locally:
- View in browser dev tools: `localStorage.getItem('aether_transaction_history')`
- Export as JSON or CSV (feature in progress)
- Persists across sessions

## 🔧 Project Structure

```
src/
├── app/
│   ├── api/agent/execute/  # x402 payment + execution API
│   └── agent/[id]/         # Agent detail pages
├── components/
│   └── PaymentModal.tsx    # x402 payment UI
├── lib/
│   ├── x402/
│   │   ├── client.ts       # Payment client
│   │   ├── facilitator.ts  # Payment verification
│   │   └── history.ts      # Transaction storage
│   └── agents/
│       └── executor.ts     # Real AI agent execution
└── types/
    └── x402.ts             # TypeScript definitions
```

## 🎨 Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Blockchain**: Aptos (via `@aptos-labs/ts-sdk`)
- **Wallet**: Petra Wallet Adapter
- **AI**: OpenAI API (DALL-E 3, GPT-4)
- **Data**: CoinGecko API
- **Payments**: x402 Protocol (custom implementation)

## 🏆 Hackathon Features

### What Makes This Special

1. **First x402 on Aptos**: No other marketplace implements the HTTP 402 status code for blockchain payments
2. **Real AI, Not Demos**: Actual OpenAI API calls, not mock responses
3. **Production Architecture**: Proper error handling, TypeScript, transaction verification
4. **Beautiful UX**: Cyberpunk-themed UI with glassmorphism and animations
5. **Sub-second Payments**: Aptos blockchain finality in <500ms

### Key Differentiators

- **True Micropayments**: Pay only for what you use, no subscriptions
- **On-Chain Verification**: Every payment is cryptographically verified
- **Transaction History**: Full audit trail of all interactions
- **Extensible**: Easy to add new AI agents and services

## 📝 Environment Variables

```bash
# Required
OPENAI_API_KEY=                    # OpenAI API key
NEXT_PUBLIC_PAYMENT_RECIPIENT=     # Your Aptos address

# Optional
NEXT_PUBLIC_APTOS_NETWORK=testnet  # or mainnet
ANTHROPIC_API_KEY=                 # For Claude integration
ALPHA_VANTAGE_KEY=                 # For stock data
```

## 🚨 Important Notes

### For Testing
- Use Aptos **Testnet** only
- Get free testnet APT from faucet
- Each execution costs real API credits (OpenAI)

### API Costs
- DALL-E 3: ~$0.04 per image (you pay OpenAI)
- GPT-4: ~$0.01 per audit (you pay OpenAI)
- CoinGecko: Free (no key needed)

The APT prices in the app (0.25, 0.15, 0.08) go to your treasury address.

## 📚 Learn More

- [x402 Protocol Spec](https://github.com/x402-protocol/spec)
- [Aptos Documentation](https://aptos.dev)
- [OpenAI API Docs](https://platform.openai.com/docs)

## 🤝 Contributing

This is a hackathon project! Feel free to fork and extend with:
- More AI agents (Anthropic Claude, Stability AI, etc.)
- Transaction history dashboard UI
- Agent reputation system
- Multi-agent workflows

## 📜 License

MIT

---

**Built with ⚡ for the Aptos x402 Protocol Hackathon**
