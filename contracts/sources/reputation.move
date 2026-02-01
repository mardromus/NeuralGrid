module aether_addr::reputation {
    use std::signer;
    use std::vector;
    use aether_addr::agent_registry;

    /// Friend modules that can update reputation
    friend aether_addr::service_escrow;

    struct ReputationState has key {
        score: u64,             // 0 to 1000
        total_volume: u64,      // Total APT processed
        tasks_completed: u64,
        successful_tasks: u64,
        disputes: u64,
        staked_funds: u64,      // APT staked by agent
    }

    /// Initialize reputation for a new agent (called by Agent Registry ideally, or manually)
    public entry fun init_reputation(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<ReputationState>(addr)) {
            move_to(account, ReputationState {
                score: 500, // Start with neutral trust
                total_volume: 0,
                tasks_completed: 0,
                successful_tasks: 0,
                disputes: 0,
                staked_funds: 0,
            });
        }
    }

    /// Stake APT to increase reputation/trust
    public entry fun stake_apt(account: &signer, agent_obj_addr: address, amount: u64) acquires ReputationState {
        // In prod: coin::transfer(account, agent_obj_addr, amount)
        let rep = borrow_global_mut<ReputationState>(agent_obj_addr);
        rep.staked_funds = rep.staked_funds + amount;
        
        // Boost score based on stake (e.g., 1 APT = 10 points)
        let boost = (amount / 100000000) * 10;
        if (rep.score + boost <= 1000) {
            rep.score = rep.score + boost;
        };
    }

    /// Update reputation after a task (Only callable by ServiceEscrow)
    public(friend) fun update_on_success(agent_obj_addr: address, volume: u64) acquires ReputationState {
        let rep = borrow_global_mut<ReputationState>(agent_obj_addr);
        
        rep.total_volume = rep.total_volume + volume;
        rep.tasks_completed = rep.tasks_completed + 1;
        rep.successful_tasks = rep.successful_tasks + 1;

        let bonus = 10;
        if (rep.score + bonus <= 1000) {
            rep.score = rep.score + bonus;
        };
    }

    /// Update reputation on dispute/failure
    public(friend) fun update_on_failure(agent_obj_addr: address) acquires ReputationState {
        let rep = borrow_global_mut<ReputationState>(agent_obj_addr);
        rep.tasks_completed = rep.tasks_completed + 1;
        rep.disputes = rep.disputes + 1;

        let penalty = 50;
        if (rep.score > penalty) {
            rep.score = rep.score - penalty;
        } else {
            rep.score = 0;
        };
    }

    #[view]
    public fun get_score(agent_addr: address): u64 acquires ReputationState {
        if (exists<ReputationState>(agent_addr)) {
            borrow_global<ReputationState>(agent_addr).score
        } else {
            0
        }
    }
}
