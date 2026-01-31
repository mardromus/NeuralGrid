/**
 * Transaction History Storage
 * Manages local storage of x402 payment transactions and agent executions
 */

export interface TransactionRecord {
    id: string;
    txnHash: string;
    agentId: string;
    agentName: string;
    taskType: string;
    parameters: Record<string, any>;
    cost: string; // in Octas
    costAPT: number;
    result: any;
    timestamp: number;
    executionTime: number;
    status: "success" | "failed" | "pending";
    blockHeight?: number;
}

const STORAGE_KEY = "aether_transaction_history";
const MAX_HISTORY_ITEMS = 100;

/**
 * Save transaction to history
 */
export function saveTransaction(transaction: TransactionRecord): void {
    if (typeof window === "undefined") return; // Server-side guard

    try {
        const history = getTransactionHistory();
        history.unshift(transaction); // Add to beginning

        // Limit size
        if (history.length > MAX_HISTORY_ITEMS) {
            history.splice(MAX_HISTORY_ITEMS);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save transaction:", error);
    }
}

/**
 * Get all transaction history
 */
export function getTransactionHistory(): TransactionRecord[] {
    if (typeof window === "undefined") return []; // Server-side guard

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load transaction history:", error);
        return [];
    }
}

/**
 * Get transaction by hash
 */
export function getTransactionByHash(txnHash: string): TransactionRecord | null {
    const history = getTransactionHistory();
    return history.find(tx => tx.txnHash === txnHash) || null;
}

/**
 * Get transactions for specific agent
 */
export function getAgentTransactions(agentId: string): TransactionRecord[] {
    const history = getTransactionHistory();
    return history.filter(tx => tx.agentId === agentId);
}

/**
 * Get transaction statistics
 */
export function getTransactionStats() {
    const history = getTransactionHistory();

    const totalTransactions = history.length;
    const successfulTransactions = history.filter(tx => tx.status === "success").length;
    const failedTransactions = history.filter(tx => tx.status === "failed").length;

    const totalSpent = history
        .filter(tx => tx.status === "success")
        .reduce((sum, tx) => sum + tx.costAPT, 0);

    const avgExecutionTime = history.length > 0
        ? history.reduce((sum, tx) => sum + tx.executionTime, 0) / history.length
        : 0;

    // Agent usage stats
    const agentUsage = history.reduce((acc, tx) => {
        acc[tx.agentId] = (acc[tx.agentId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        totalSpent,
        avgExecutionTime,
        agentUsage,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
    };
}

/**
 * Clear all transaction history
 */
export function clearTransactionHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export transaction history as JSON
 */
export function exportTransactionHistory(): string {
    const history = getTransactionHistory();
    return JSON.stringify(history, null, 2);
}

/**
 * Export transactions as CSV
 */
export function exportTransactionsCSV(): string {
    const history = getTransactionHistory();

    const headers = ["Timestamp", "Agent", "Task Type", "Cost (APT)", "Status", "Execution Time (ms)", "Transaction Hash"];
    const rows = history.map(tx => [
        new Date(tx.timestamp).toISOString(),
        tx.agentName,
        tx.taskType,
        tx.costAPT.toString(),
        tx.status,
        tx.executionTime.toString(),
        tx.txnHash
    ]);

    const csv = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    return csv;
}
