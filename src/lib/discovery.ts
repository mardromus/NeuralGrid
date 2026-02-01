import { Agent } from "@/store/agentStore";

export interface IntentMatch {
    agent: Agent;
    confidence: number;
    reasoning: string;
}

const INTENT_MAP: Record<string, string[]> = {
    "audit": ["Smart Contract Auditor", "Security", "Code Review"],
    "legal": ["Legal Assistant", "Compliance", "Contract Analysis"],
    "write code": ["Software Engineer", "Developer", "Scripting"],
    "render": ["3D Modeling", "GPU Accelerator", "Reality Forge"],
    "analyze data": ["Data Analyst", "Oracle", "Insights"],
    "price": ["Finance", "Trading", "Market Analysis"],
    "generate image": ["Visual Artist", "Stable Diffusion", "Creative"],
};

/**
 * Searches for agents based on natural language intent.
 * @param intent The user's query (e.g., "Find an agent to audit my Move contract")
 * @param agents The list of available agents
 */
export function findAgentsByIntent(intent: string, agents: Agent[]): IntentMatch[] {
    const query = intent.toLowerCase();
    const results: IntentMatch[] = [];

    for (const agent of agents) {
        let score = 0;
        let reasons: string[] = [];

        // 1. Direct tag matching
        const tags = INTENT_MAP[Object.keys(INTENT_MAP).find(k => query.includes(k)) || ""] || [];
        const agentCapabilities = agent.onChainData ? [] : [agent.category || ""]; // Mocking for now

        for (const tag of tags) {
            if (agent.name.includes(tag) || agent.description.includes(tag) || agent.category?.includes(tag)) {
                score += 0.5;
                reasons.push(`Matched intent tag: ${tag}`);
            }
        }

        // 2. Keyword matching
        const keywords = ["audit", "legal", "code", "render", "data", "price", "image"];
        for (const kw of keywords) {
            if (query.includes(kw) && (agent.description.toLowerCase().includes(kw) || agent.name.toLowerCase().includes(kw))) {
                score += 0.3;
                reasons.push(`Matched keyword: ${kw}`);
            }
        }

        // 3. Reputation weighting
        if (agent.onChainData) {
            score += (agent.onChainData.reputationScore / 1000) * 0.2;
        }

        if (score > 0) {
            results.push({
                agent,
                confidence: Math.min(score, 1.0),
                reasoning: reasons.join(", ")
            });
        }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
}
