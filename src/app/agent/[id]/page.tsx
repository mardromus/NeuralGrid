"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAgentStore } from '@/store/agentStore';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, CheckCircle, AlertCircle, ArrowLeft, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { useKeyless } from '@/lib/keyless/provider'; // Use Keyless provider
import { toast } from 'sonner';
import { SwarmGraph } from '@/components/SwarmGraph';
import { PaymentModal } from '@/components/PaymentModal';

interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'payment';
}

export default function AgentDetailsPage() {
    const params = useParams();
    const { agents } = useAgentStore();
    const { isAuthenticated } = useKeyless(); // Use Keyless auth check
    const [agent, setAgent] = useState(agents.find(a => a.id === params.id));
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [outputData, setOutputData] = useState<{ type: string, content: any } | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [taskParams, setTaskParams] = useState<any>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    // Refresh agent if store loads later or changes
    useEffect(() => {
        const found = agents.find(a => a.id === params.id);
        if (found) setAgent(found);
    }, [agents, params.id]);

    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message,
            type
        }]);
    };

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current)
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
        }
    }, [logs]);

    const handleExecuteAgent = () => {
        if (!agent) return;
        if (!isAuthenticated) {
            toast.error("Please login with Google first");
            addLog("Execution Aborted: Authentication required.", "error");
            return;
        }

        // Reset State
        setLogs([]);
        setOutputData(null);

        // Determine task type based on agent category
        let taskType = 'financial-analysis';
        let params: any = { symbol: 'APT' };

        if (agent.category?.toLowerCase().includes('forge') || agent.name.includes("VORTEX")) {
            taskType = 'image-generation';
            params = { prompt: 'A futuristic AI agent in a cyberpunk city' };
        } else if (agent.category?.toLowerCase().includes('logic') || agent.name.includes("DEEP")) {
            taskType = 'code-audit';
            params = { code: 'function transfer(address to, uint amount) { balances[to] += amount; }' };
        }

        setTaskParams(params);
        addLog(`Initializing x402 payment protocol...`, "info");
        addLog(`Task: ${taskType}`, "info");

        // Open payment modal
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = (result: any) => {
        addLog(`Payment confirmed! Transaction: ${result.payment?.transactionHash}`, "payment");
        addLog(`Agent execution completed in ${result.executionTime}ms`, "success");
        addLog(`Cost: ${result.cost} Octas`, "payment");

        // Save to transaction history
        if (result.payment?.transactionHash && agent && typeof params.id === 'string') {
            import("@/lib/x402/history").then(({ saveTransaction }) => {
                saveTransaction({
                    id: `tx-${Date.now()}`,
                    txnHash: result.payment.transactionHash,
                    agentId: params.id as string,
                    agentName: agent.name,
                    taskType: agent.category || "unknown",
                    parameters: taskParams,
                    cost: result.cost || "0",
                    costAPT: agent.price,
                    result: result.result,
                    timestamp: Date.now(),
                    executionTime: result.executionTime || 0,
                    status: "success",
                    blockHeight: result.payment.blockHeight
                });
                addLog("✅ Transaction saved to history", "success");
            }).catch(console.error);
        }

        // Set output data based on result type
        if (result.result) {
            const resultType = result.result.type || 'text';
            setOutputData({
                type: resultType,
                content: resultType === 'image' ? result.result.url :
                    resultType === 'audit-report' ? JSON.stringify(result.result, null, 2) :
                        resultType === 'financial-data' ? JSON.stringify(result.result, null, 2) :
                            result.result
            });
        }

        toast.success("Task completed successfully!");
        setIsPaymentModalOpen(false);
    };

    if (!agent) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                    <h1 className="text-4xl font-bold text-red-500">AGENT NOT FOUND</h1>
                    <Link href="/">
                        <Button className="glass-card">Return to Base</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="pt-24 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Agent Info */}
                <div className="lg:col-span-1 space-y-6 animate-in slide-in-from-left duration-500">
                    <Link href="/" className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Market
                    </Link>

                    <Card className="glass-card border-primary/20 overflow-hidden">
                        <div className="h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 relative">
                            <div className="absolute -bottom-10 left-6">
                                <img src={agent.imageUrl} alt={agent.name} className="w-24 h-24 rounded-xl border-4 border-black bg-black" />
                            </div>
                        </div>
                        <div className="pt-12 px-6 pb-6 space-y-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                                <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary border-primary/20">
                                    {agent.category || "General"} Agent
                                </Badge>
                            </div>

                            <p className="text-muted-foreground text-sm">{agent.description}</p>

                            <Separator className="bg-white/10" />

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Price per Request</span>
                                <span className="text-xl font-bold text-green-400 font-mono">{agent.price} APT</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Reputation Score</span>
                                <span className="text-primary font-bold">{agent.onChainData?.reputationScore || agent.reputation}/1000</span>
                            </div>

                            {/* x402 Payment Button */}
                            <Button
                                className="w-full bg-primary hover:bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(14,165,233,0.2)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all h-12"
                                onClick={handleExecuteAgent}
                            >
                                <Zap className="w-4 h-4 mr-2 fill-current" />
                                EXECUTE WITH x402
                            </Button>

                            <div className="text-[10px] text-center font-mono text-muted-foreground">
                                Pay-per-request micropayment • Sub-second settlement
                            </div>
                        </div>
                    </Card>

                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">System Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm font-mono text-green-500/80">
                            <div className="flex justify-between">
                                <span>Latency</span>
                                <span>{agent.specs?.latency || "~45ms"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Uptime</span>
                                <span>99.9%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Success Rate</span>
                                <span>{(100 - (agent.onChainData?.disputeRate || 0)).toFixed(1)}%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Console / Execution Log */}
                <div className="lg:col-span-2 animate-in slide-in-from-right duration-500 delay-100 h-full max-h-[800px] flex flex-col">
                    <Card className="glass-card border-white/10 flex-1 flex flex-col overflow-hidden bg-black/80">
                        <CardHeader className="bg-white/5 border-b border-white/5 py-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                                <Terminal className="w-4 h-4" />
                                <span>EXECUTION CONSOLE</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative">
                            <ScrollArea className="h-[600px] w-full p-4 font-mono text-sm" ref={scrollRef}>
                                <div className="min-h-full">
                                    {logs.length === 0 && (
                                        <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground/30 space-y-4">
                                            <BrainCircuit className="w-24 h-24 opacity-20 animate-pulse" />
                                            <p className="font-mono text-center">
                                                Awaiting Neural Link...<br />
                                                <span className="text-xs opacity-50">x402 Protocol Ready</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Swarm Visualization */}
                                    {agent.isSwarm && logs.length > 0 && (
                                        <SwarmGraph active={true} step={logs.length} />
                                    )}

                                    {/* RICH OUTPUT RENDERER */}
                                    {outputData && (
                                        <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
                                            <div className="text-xs text-muted-foreground font-mono mb-2 uppercase tracking-widest border-b border-white/5 pb-1">
                                                Result Payload [{outputData.type}]
                                            </div>

                                            {outputData.type === 'image' && (
                                                <div className="relative group">
                                                    <img src={outputData.content} alt="Agent Output" className="w-full rounded-lg border border-white/10 shadow-2xl transition-transform duration-500" />
                                                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur">
                                                        GENERATED BY {agent.name.toUpperCase()}
                                                    </div>
                                                </div>
                                            )}

                                            {(outputData.type === 'audit-report' || outputData.type === 'financial-data' || outputData.type === 'text') && (
                                                <pre className="whitespace-pre-wrap font-mono text-xs text-green-300/90 leading-relaxed max-h-[300px] overflow-y-auto">
                                                    {typeof outputData.content === 'string' ? outputData.content : JSON.stringify(outputData.content, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {logs.map((log, i) => (
                                            <div key={i} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                                <span className="text-xs text-muted-foreground min-w-[80px] pt-0.5">{log.timestamp}</span>
                                                <div className="flex-1 break-all">
                                                    {log.type === 'info' && <span className="text-blue-400">ℹ {log.message}</span>}
                                                    {log.type === 'success' && <span className="text-green-400 flex items-start gap-1"><CheckCircle className="w-3 h-3 mt-1" /> {log.message}</span>}
                                                    {log.type === 'error' && <span className="text-red-400 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-1" /> {log.message}</span>}
                                                    {log.type === 'warning' && <span className="text-yellow-400">⚠ {log.message}</span>}
                                                    {log.type === 'payment' && <span className="text-purple-400 flex items-center gap-1"><Zap className="w-3 h-3 fill-current" /> {log.message}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* x402 Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                agentId={agent.id}
                agentName={agent.name}
                taskType={taskParams.prompt ? 'image-generation' : taskParams.code ? 'code-audit' : 'financial-analysis'}
                taskParameters={taskParams}
                priceAPT={agent.price}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
}
