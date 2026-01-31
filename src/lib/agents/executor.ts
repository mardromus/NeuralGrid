/**
 * Real Agent Execution Engine
 * 
 * Handles routing to actual AI services based on agent type
 */

import OpenAI from "openai";

// Agent type definitions
export type AgentType = "image-generation" | "code-audit" | "financial-analysis" | "general";

export interface AgentExecutionResult {
    result: any;
    executionTime: number;
    agentId: string;
    taskType: string;
    metadata?: Record<string, any>;
}

// Initialize AI clients (lazy loading for performance)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY not configured");
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

/**
 * Execute image generation task using DALL-E 3
 */
async function executeImageGeneration(parameters: any): Promise<any> {
    const openai = getOpenAIClient();

    const prompt = parameters.prompt || "A beautiful landscape";
    const size = parameters.size || "1024x1024";

    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: size as "1024x1024" | "1792x1024" | "1024x1792",
            quality: "standard",
        });

        return {
            type: "image",
            url: response.data[0].url,
            prompt: prompt,
            revisedPrompt: response.data[0].revised_prompt,
            dimensions: size,
            model: "dall-e-3"
        };
    } catch (error) {
        console.error("Image generation error:", error);
        throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Execute code audit using GPT-4
 */
async function executeCodeAudit(parameters: any): Promise<any> {
    const openai = getOpenAIClient();

    const code = parameters.code || "";
    const language = parameters.language || "javascript";

    if (!code) {
        throw new Error("No code provided for audit");
    }

    try {
        const systemPrompt = `You are an expert code auditor. Analyze the provided ${language} code for:
1. Security vulnerabilities
2. Performance issues
3. Code quality and best practices
4. Potential bugs

Provide a JSON response with:
- overallScore (0-10)
- vulnerabilities: array of {severity: "high"|"medium"|"low", description: string, line?: number}
- suggestions: array of improvement suggestions
- strengths: array of good practices found`;

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `\`\`\`${language}\n${code}\n\`\`\`` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const auditResult = JSON.parse(response.choices[0].message.content || "{}");

        return {
            type: "audit-report",
            language,
            codeLength: code.length,
            overallScore: auditResult.overallScore || 7,
            vulnerabilities: auditResult.vulnerabilities || [],
            suggestions: auditResult.suggestions || [],
            strengths: auditResult.strengths || [],
            model: "gpt-4-turbo"
        };
    } catch (error) {
        console.error("Code audit error:", error);
        throw new Error(`Failed to audit code: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Execute financial data analysis using CoinGecko API (free tier)
 */
async function executeFinancialAnalysis(parameters: any): Promise<any> {
    const symbol = parameters.symbol || "bitcoin";
    const isCrypto = !symbol.match(/^[A-Z]{1,5}$/); // Simple check: crypto if not all caps ticker

    try {
        if (isCrypto) {
            // Use CoinGecko API (no key required for public endpoint)
            const coinId = symbol.toLowerCase();
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.statusText}`);
            }

            const data = await response.json();
            const marketData = data.market_data;

            return {
                type: "financial-data",
                assetType: "cryptocurrency",
                symbol: data.symbol.toUpperCase(),
                name: data.name,
                price: marketData.current_price.usd,
                change24h: marketData.price_change_percentage_24h.toFixed(2) + "%",
                change7d: marketData.price_change_percentage_7d?.toFixed(2) + "%",
                marketCap: `$${(marketData.market_cap.usd / 1e9).toFixed(2)}B`,
                volume24h: `$${(marketData.total_volume.usd / 1e6).toFixed(2)}M`,
                high24h: marketData.high_24h.usd,
                low24h: marketData.low_24h.usd,
                allTimeHigh: marketData.ath.usd,
                allTimeLow: marketData.atl.usd,
                circulatingSupply: marketData.circulating_supply,
                lastUpdated: new Date(data.last_updated).toISOString()
            };
        } else {
            // For stocks, use a simple mock (or integrate Alpha Vantage with key)
            return {
                type: "financial-data",
                assetType: "stock",
                symbol: symbol,
                message: "Stock data requires Alpha Vantage API key. Add ALPHA_VANTAGE_KEY to .env.local",
                price: "N/A",
                change24h: "N/A"
            };
        }
    } catch (error) {
        console.error("Financial analysis error:", error);
        throw new Error(`Failed to fetch financial data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Main agent execution router
 */
export async function executeAgent(
    agentId: string,
    taskType: AgentType,
    parameters: Record<string, any>
): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
        let result: any;

        switch (taskType) {
            case "image-generation":
                result = await executeImageGeneration(parameters);
                break;

            case "code-audit":
                result = await executeCodeAudit(parameters);
                break;

            case "financial-analysis":
                result = await executeFinancialAnalysis(parameters);
                break;

            default:
                // Fallback: general AI chat using GPT-4
                const openai = getOpenAIClient();
                const response = await openai.chat.completions.create({
                    model: "gpt-4-turbo-preview",
                    messages: [
                        { role: "user", content: parameters.query || "Hello!" }
                    ],
                    max_tokens: 500,
                });

                result = {
                    type: "text",
                    response: response.choices[0].message.content,
                    model: "gpt-4-turbo"
                };
        }

        return {
            result,
            executionTime: Date.now() - startTime,
            agentId,
            taskType,
            metadata: {
                timestamp: new Date().toISOString(),
                success: true
            }
        };
    } catch (error) {
        return {
            result: {
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                details: "Agent execution failed. Check API keys and parameters."
            },
            executionTime: Date.now() - startTime,
            agentId,
            taskType,
            metadata: {
                timestamp: new Date().toISOString(),
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }
        };
    }
}

/**
 * Get agent type from agent ID
 */
export function getAgentType(agentId: string): AgentType {
    const agentTypeMap: Record<string, AgentType> = {
        "neural-alpha": "image-generation",
        "quantum-sage": "code-audit",
        "oracle-prime": "financial-analysis",
    };

    return agentTypeMap[agentId] || "general";
}
