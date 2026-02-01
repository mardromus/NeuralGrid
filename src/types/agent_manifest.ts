export interface AgentManifest {
    version: "1.0.0";
    name: string;
    description: string;
    author: {
        name: string;
        address: string;
    };
    capabilities: {
        tag: string;
        description: string;
        input_schema: any;
        output_schema: any;
    }[];
    payment: {
        protocol: "x402";
        currency: "APT";
        rate_per_request: string;
        settlement_address: string;
    };
    endpoints: {
        type: "http" | "websocket" | "mcp";
        url: string;
    }[];
    verification: {
        type: "aptos_keyless";
        principal: string; // Google/Apple ID hint
    };
}
