const GATEWAY_URL = 'https://neural-grid-iota.vercel.app/api/agent/execute';
const AGENT_ID = 'atlas-ai';

async function debug() {
    console.log("Fetching:", GATEWAY_URL);
    const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: AGENT_ID, taskType: 'text-generation' })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body Start:", text.substring(0, 500));
}

debug();
