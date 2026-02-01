module aether_addr::service_escrow {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aether_addr::reputation;

    struct EscrowStore has key {
        locked_funds: u64,
    }

    /// Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_TASK_NOT_FOUND: u64 = 2;

    struct TaskEscrow has key {
        requester: address,
        provider: address, // Agent Object Address
        amount: u64,
        status: u8, // 0: Created, 1: Completed, 2: Disputed
        result_hash: String, // Proof of Task Hash
        created_at: u64,
    }

    /// Deposit funds to hire an agent
    public entry fun hire_agent(
        account: &signer,
        provider: address,
        amount: u64
    ) {
        let requester_addr = signer::address_of(account);
        
        move_to(account, TaskEscrow {
            requester: requester_addr,
            provider,
            amount,
            status: 0,
            result_hash: std::string:: some_empty_string(), // Placeholder
            created_at: timestamp::now_seconds(),
        });
    }

    /// Release funds upon completion
    public entry fun complete_task(
        account: &signer,
        task_owner: address,
        result_hash: String
    ) acquires TaskEscrow {
        let escrow = borrow_global_mut<TaskEscrow>(task_owner);
        
        escrow.status = 1; // Completed
        escrow.result_hash = result_hash;

        // Update Reputation using the Provider Object Address
        reputation::update_on_success(escrow.provider, escrow.amount);
    }

    /// Dispute a task (slashes reputation and potentially stake)
    public entry fun dispute_task(
        account: &signer,
        task_owner: address
    ) acquires TaskEscrow {
        let escrow = borrow_global_mut<TaskEscrow>(task_owner);
        escrow.status = 2; // Disputed

        // Penalty call
        reputation::update_on_failure(escrow.provider);
    }
}
