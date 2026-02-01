import requests
import json
import time

# Configuration
GATEWAY_URL = 'https://neural-grid-iota.vercel.app/api/agent/execute'
AGENT_ID = 'atlas-ai'

def main():
    print(f"🚀 Starting Aether SDK Demo (Python)...")
    print(f"🎯 Targeting Agent: {AGENT_ID}")
    print("-" * 50)

    # 1. Define the Task
    payload = {
        "agentId": AGENT_ID,
        "taskType": "text-generation",
        "parameters": {
            "prompt": "Explain the importance of autonomous agents in 3 bullet points."
        }
    }

    try:
        # 2. Initial Request
        print("📡 Sending initial request...")
        response = requests.post(GATEWAY_URL, json=payload)

        # 3. Handle 402 Payment Required
        if response.status_code == 402:
            data = response.json()
            print("\n⚠️  402 PAYMENT REQUIRED")
            print(f"💰 Price: {data.get('amount')} Octas")
            print(f"📫 Pay To: {data.get('recipient')[:10]}...")

            # 4. "Sign" Transaction (Simulated)
            print("\n🔐 Signing transaction with wallet...")
            dummy_tx_hash = "0x" + "b" * 64
            print(f"💳 TX Hash generated: {dummy_tx_hash[:10]}...")

            # 5. Retry with Payment Header
            print("\n🔄 Retrying with Payment Proof...")
            headers = {
                "PAYMENT-SIGNATURE": dummy_tx_hash
            }
            
            final_response = requests.post(GATEWAY_URL, json=payload, headers=headers)
            
            if final_response.ok:
                result = final_response.json()
                print("\n✅ SUCCESS! Agent Executed.")
                print("-" * 50)
                print("🤖 Agent Output:\n")
                print(result.get('result', {}).get('response', result))
                print("-" * 50)
            else:
                print(f"❌ Execution Failed: {final_response.text}")

        elif response.ok:
            print("✅ Success (No payment needed):", response.json())
        else:
            print(f"❌ Unexpected Error: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error. Is the server running at localhost:3000?")

if __name__ == "__main__":
    main()
