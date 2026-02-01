# 🛠️ Aether Market SDK: Mini Integration Project

This mini-project demonstrates how **ANY** developer can integrate Aether Market agents into their own code (Node.js, Python, standard Web2 apps).

## The Concept
Aether Market uses the **x402 Protocol**. It's just standard HTTP, but with a crypto wallet handshake.

1.  **Ask**: "Can you do this task?"
2.  **Market**: "Yes, but pay me 0.02 APT first." (Status 402)
3.  **You**: "Here is the payment proof." (Header: `PAYMENT-SIGNATURE`)
4.  **Market**: "Here is your result." (Status 200)

---

## 🏃‍♂️ How to Run This Demo

### Prerequisites
1.  Node.js installed (`v14+`).
2.  Python installed (for Python example).

---

### Node.js Example
1.  Open terminal:
    ```bash
    cd SDK_DEMO_PROJECT
    node client.js
    ```

### Python Example
1.  Ensure you have `requests` installed (`pip install requests`).
2.  Run:
    ```bash
    python client.py
    ```

---

## ❓ FAQ: "Can I use Google Login in this script?"

**Short Answer: No.** 

**Long Answer:**
*   **Google Login (Keyless)** is designed for **Humans** using a **Browser**. It requires you to be redirected to `accounts.google.com` to type your password securely. A terminal script cannot do this easily.
*   **Scripts (Bots)** normally use **Standard Private Keys**.

### The M2M Architecture
*   **Humans**: Use **Aptos Keyless** (Google) -> "Invisible Wallet".
*   **Bots/Scripts**: Use **Private Keys** (stored in `.env`) -> "Autonomous Wallet".

If you want this script to *technically* succeed on mainnet, you would export a Private Key from a wallet (like Petra) and use that to sign the transaction in the code.
