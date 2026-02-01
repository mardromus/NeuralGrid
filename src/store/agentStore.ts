import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Agent {
    id: string;
    name: string;
    description: string;
    price: number;
    reputation: number;
    imageUrl: string;
    endpoint: string;
    category?: string;
    // New 2027 Specs
    specs?: {
        architecture: string; // e.g., "Omni-7B-Quantized"
        tflops: string;      // e.g., "450 TFLOPS"
        vram: string;        // e.g., "8x H100 Cluster"
        latency: string;     // e.g., "12ms"
    };
    isSwarm?: boolean;
    // Aether Protocol V1 Fields
    onChainData?: {
        registryId: string;
        ownerAddress: string;
        reputationScore: number; // 0-1000
        totalVolume: number;     // APT
        disputeRate: number;    // % 0-100
    };
}

interface AgentState {
    agents: Agent[];
    addAgent: (agent: Agent) => void;
    updateReputation: (id: string, score: number) => void;
}

const DEFAULT_AGENTS: Agent[] = [
    {
        id: "nexus-prime",
        name: "NEXUS PRIME",
        description: "The central coordination node. Orchestrates multi-agent workflows with 99.9% accuracy.",
        price: 0.03,
        reputation: 99,
        imageUrl: "https://robohash.org/nexus?set=set1&bgset=bg1",
        endpoint: "/api/mock-agent",
        category: "Orchestrator",
        isSwarm: true,
        specs: {
            architecture: "GPT-6 (Refactored)",
            tflops: "8.2 PFLOPS",
            vram: "Global Pool",
            latency: "4ms"
        },
        onChainData: {
            registryId: "0x1::1",
            ownerAddress: "0xcafe...babe",
            reputationScore: 998,
            totalVolume: 45000,
            disputeRate: 0.01
        }
    },
    {
        id: "quantum-sage",
        name: "DEEP THINK v9",
        description: "Specialized in recursive reasoning and cryptographic proofs. Solves NP-Hard problems in seconds.",
        price: 0.5,
        reputation: 97,
        imageUrl: "https://robohash.org/deepthink?set=set1&bgset=bg1",
        endpoint: "/api/mock-agent",
        category: "Logic Engine",
        specs: {
            architecture: "Llama-Omega-128B",
            tflops: "1.2 PFLOPS",
            vram: "4x H200",
            latency: "200ms"
        },
        onChainData: {
            registryId: "0x1::2",
            ownerAddress: "0xdead...beef",
            reputationScore: 850,
            totalVolume: 1200,
            disputeRate: 2.5
        }
    },
    {
        id: "neural-alpha",  // Changed from "3" to match executor
        name: "VORTEX RENDERER",
        description: "Hyper-realistic asset generation pipeline. Capable of real-time 8K video synthesis.",
        price: 0.05,
        reputation: 92,
        imageUrl: "https://robohash.org/vortex?set=set1&bgset=bg1",
        endpoint: "/api/mock-agent",
        category: "Reality Forge",
        specs: {
            architecture: "Stable-Diffusion-X",
            tflops: "550 TFLOPS",
            vram: "Distributed GPU",
            latency: "1.5s"
        }
    },
    {
        id: "oracle-prime",
        name: "DATA SUIT 7",
        description: "Autonomous web scraper and vectorizer. Converting the internet into structured knowledge.",
        price: 0.05,
        reputation: 88,
        imageUrl: "https://robohash.org/data?set=set1&bgset=bg1",
        endpoint: "/api/mock-agent",
        category: "Data Harvester",
        specs: {
            architecture: "Mistral-Small-Flash",
            tflops: "120 TFLOPS",
            vram: "Edge Compute",
            latency: "12ms"
        }
    }
];

export const useAgentStore = create<AgentState>()(
    persist(
        (set) => ({
            agents: DEFAULT_AGENTS,
            addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
            updateReputation: (id, score) => set((state) => ({
                agents: state.agents.map(a => a.id === id ? { ...a, reputation: score } : a)
            })),
        }),
        {
            name: 'aether-agent-storage',
        }
    )
);
