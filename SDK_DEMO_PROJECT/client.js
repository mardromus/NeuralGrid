/**
 * Aether Market - Mini Integration Demo
 * 
 * This script demonstrates how an external developer can call an AI Agent
 * on Aether Market programmatically using the x402 Payment Protocol.
 * 
 * RUNNING THIS:
 * 1. Ensure the Aether Market app is running on localhost:3000
 * 2. Run: node client.js
 */

const GATEWAY_URL = 'https://neural-grid-iota.vercel.app/api/agent/execute';
const AGENT_ID = 'atlas-ai'; // We'll use the Text Agent for this demo

// Mocking a Crypto Wallet for the demo
// In a real app, you'd use @aptos-labs/ts-sdk
const MOCK_WALLET = {
    address: "0x123...abc",
    sign: (message) => `0xSigned_${message}_By_User`
};

async function main() {
    console.log("🚀 Starting Aether SDK Demo...");
    console.log(`🎯 Targeting Agent: ${AGENT_ID}`);
    console.log("------------------------------------------------");

    // 1. Define the Task
    const taskPayload = {
        agentId: AGENT_ID,
        taskType: 'text-generation',
        parameters: {
            prompt: "Explain why decentralized AI is the future in one sentence."
        }
    };

    try {
        // 2. Initial Request (Expect 402)
        console.log("📡 Sending initial request...");
        const response1 = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskPayload)
        });

        if (response1.status === 402) {
            const invoice = await response1.json();
            console.log("\n⚠️  402 PAYMENT REQUIRED");
            console.log(`💰 Price: ${invoice.amount} Octas`);
            console.log(`📫 Pay To: ${invoice.recipient.substring(0, 10)}...`);

            // 3. "Pay" and Sign
            // In a real app, we would broadcast an on-chain txn here.
            // For this demo (Testnet Optimistic), we simulate the signature.
            console.log("\n🔐 Signing transaction with wallet...");
            const dummyTxnHash = "0x" + Array(64).fill('a').join('');
            console.log(`💳 TX Hash generated: ${dummyTxnHash.substring(0, 10)}...`);

            // 4. Retry with Payment Header
            console.log("\n🔄 Retrying with Payment Proof...");
            const response2 = await fetch(GATEWAY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'PAYMENT-SIGNATURE': dummyTxnHash // The x402 Header
                },
                body: JSON.stringify(taskPayload)
            });

            const result = await response2.json();

            if (response2.ok) {
                console.log("\n✅ SUCCESS! Agent Executed.");
                console.log("------------------------------------------------");
                console.log("🤖 Agent Output:\n");
                console.log(result.result.response || result);
                console.log("------------------------------------------------");
            } else {
                console.error("❌ Execution Failed:", result);
            }

        } else if (response1.ok) {
            // Free agent?
            const result = await response1.json();
            console.log("✅ Success (No payment needed):", result);
        } else {
            console.error("❌ Unexpected Error:", response1.status);
        }

    } catch (error) {
        console.error("❌ Connection Error. Is the server running at localhost:3000?", error.message);
    }
}

main();
