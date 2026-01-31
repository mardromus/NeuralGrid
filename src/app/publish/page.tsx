"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { agentSchema, AgentFormData } from '@/lib/schema';
import { useAgentStore } from '@/store/agentStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Box, Cpu, ShieldCheck } from 'lucide-react';
import { NetworkBackground } from '@/components/NetworkBackground';

export default function PublishPage() {
    const { addAgent } = useAgentStore();
    const router = useRouter();
    const [isMinting, setIsMinting] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<AgentFormData>({
        // @ts-ignore - zod resolver type inference issue
        resolver: zodResolver(agentSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            endpoint: "https://",
            category: "General"
        }
    });

    const onSubmit = async (data: AgentFormData) => {
        setIsMinting(true);

        // Simulate "Minting" delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newAgent = {
            id: crypto.randomUUID(),
            ...data,
            reputation: 100, // Initial Score
            imageUrl: `https://robohash.org/${data.name}?set=set1&bgset=bg1`,
            isSwarm: true,
            specs: {
                architecture: "Custom-Minted-v1",
                tflops: "Variable",
                vram: "On-Chain-Allocated",
                latency: "~100ms"
            }
        };

        addAgent(newAgent);
        toast.success("Agent Minted Successfully on Aptos Testnet!"); // Mock message
        setIsMinting(false);
        router.push('/');
    };

    return (
        <div className="min-h-screen relative text-foreground">
            <NetworkBackground />
            <Navbar />

            <div className="pt-32 px-6 max-w-2xl mx-auto pb-20 relative z-10">
                <Card className="glass-card border-primary/20 bg-black/80 backdrop-blur-xl">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <Box className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-white">MINT COMPUTE ASSET</CardTitle>
                                <CardDescription className="text-cyan-400 font-mono text-xs tracking-wider">
                                    DEPLOY NEW NEURAL NODE TO AETHER GRID
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            <div className="space-y-2">
                                <Label className="text-white">NODE IDENTIFIER (Name)</Label>
                                <Input disabled={isMinting} {...register("name")} placeholder="e.g. ALPHA-REASONER-V1" className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/50 font-mono" />
                                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">CAPABILITIES (Description)</Label>
                                <Textarea disabled={isMinting} {...register("description")} placeholder="Describe the swarm's specialized function..." className="bg-white/5 border-white/10 text-white min-h-[100px]" />
                                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">EXECUTION COST (APT)</Label>
                                    <Input disabled={isMinting} type="number" step="0.0001" {...register("price")} className="bg-white/5 border-white/10 text-white font-mono" />
                                    {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">NODE CATEGORY</Label>
                                    <Select onValueChange={(val) => setValue("category", val)} disabled={isMinting}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Orchestrator">Orchestrator</SelectItem>
                                            <SelectItem value="Logic Engine">Logic Engine</SelectItem>
                                            <SelectItem value="Reality Forge">Reality Forge</SelectItem>
                                            <SelectItem value="Data Harvester">Data Harvester</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">ENDPOINT (API URL)</Label>
                                <Input disabled={isMinting} {...register("endpoint")} placeholder="https://api.my-agent.com/v1" className="bg-white/5 border-white/10 text-white font-mono" />
                                {errors.endpoint && <p className="text-red-400 text-xs mt-1">{errors.endpoint.message}</p>}
                            </div>

                            {/* Verification Visual */}
                            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-green-400">VERIFIABLE MINTING ENABLED</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This agent will be minted as an NFT on Aptos (Mock). Ownership is transferable. Revenue is streamed to holder.
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-cyan-400 text-black hover:opacity-90 shadow-lg shadow-cyan-500/20"
                                disabled={isMinting}
                            >
                                {isMinting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> MINTING ASSET...
                                    </>
                                ) : (
                                    <>
                                        <Cpu className="w-5 h-5 mr-2" /> MINT AGENT
                                    </>
                                )}
                            </Button>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
