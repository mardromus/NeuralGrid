const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

const GATEWAY_URL = 'https://neural-grid-iota.vercel.app/api/agent/execute';
const AGENT_ID = 'atlas-ai';

// --- WALLET CONFIGURATION (Wallet 2) ---
const PRIVATE_KEY_HEX = "0xE53E678AE6D649BDA6735CC0ADFD64CC6EF1D749CCF10F25488706C2C56B0BC1";
const ACCOUNT_ADDRESS = "0xaaea48900c8f8045876505fe5fc5a623b1e423ef573a55b8b308cdecc749e6f4";

// Setup Aptos SDK
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

async function main() {
    console.log("🚀 Starting Aether SDK Demo (Real Wallet Mode)...");
    console.log(`🎯 Targeting Agent: ${AGENT_ID}`);
    console.log(`👛 Caller: ${ACCOUNT_ADDRESS}`);
    console.log("------------------------------------------------");

    // Initialize Account
    const privateKey = new Ed25519PrivateKey(PRIVATE_KEY_HEX);
    const account = Account.fromPrivateKey({ privateKey });

    console.log("✅ Wallet Loaded via Private Key");

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
            console.log(`📫 Recipient: ${invoice.recipient}`);

            // 3. Perform REAL On-Chain Payment
            console.log("\n🔗 Broadcasting Real Transaction to Aptos...");

            const transaction = await aptos.transaction.build.simple({
                sender: account.accountAddress,
                data: {
                    function: "0x1::aptos_account::transfer",
                    functionArguments: [invoice.recipient, parseInt(invoice.amount)],
                },
            });

            const senderAuthenticator = aptos.transaction.sign({
                signer: account,
                transaction,
            });

            const committedTxn = await aptos.transaction.submit.simple({
                transaction,
                senderAuthenticator,
            });

            console.log(`⏳ Transaction submitted: ${committedTxn.hash}`);
            console.log("waiting for confirmation...");

            await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
            console.log("✅ Transaction Confirmed on Chain!");

            // 4. Retry with Payment Proof
            console.log("\n🔄 Retrying with Payment Proof...");

            // Add request ID so server can verify original price/params
            const retryPayload = { ...taskPayload, requestId: invoice.requestId };

            const response2 = await fetch(GATEWAY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'PAYMENT-SIGNATURE': JSON.stringify({
                        signature: senderAuthenticator.signature.toString(), // Not used for simple verification but good practice
                        txnHash: committedTxn.hash,
                        publicKey: account.publicKey.toString(),
                        timestamp: Date.now()
                    })
                },
                body: JSON.stringify(retryPayload)
            });

            const result = await response2.json();

            if (response2.ok) {
                console.log("\n✅ SUCCESS! Agent Executed.");
                console.log("------------------------------------------------");
                console.log("🤖 Agent Output:\n");
                console.log(result.result.response || result);
                console.log("------------------------------------------------");
                console.log(`💸 Total Cost: ${result.cost} Octas`);
            } else {
                console.error("❌ Execution Failed:", result);
            }

        } else if (response1.ok) {
            const result = await response1.json();
            console.log("✅ Success (No payment needed):", result);
        } else {
            console.error("❌ Unexpected Error:", response1.status, response1.statusText);
        }

    } catch (error) {
        console.error("❌ SDK Error:", error);
    }
}

main();
