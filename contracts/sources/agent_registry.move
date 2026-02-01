module aether_addr::agent_registry {
    use std::string::{String};
    use std::vector;
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self, Object, ExtendRef};

    /// Error codes
    const E_AGENT_ALREADY_EXISTS: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;

    /// The AgentCard stored within an Aptos Object
    struct AgentCard has key {
        id: u64,
        owner: address,
        name: String,
        description: String,
        manifest_url: String, // ERC-8004 Manifest Link
        capabilities: vector<String>,
        payment_rate: u64,
        payment_endpoint: String, // x402 endpoint
        created_at: u64,
        extend_ref: ExtendRef,
    }

    /// Global Registry tracking metadata
    struct Registry has key {
        agent_count: u64,
    }

    /// Event emitted when a new agent is registered
    #[event]
    struct AgentRegistered has drop, store {
        agent_id: u64,
        agent_obj_addr: address,
        owner: address,
        name: String,
    }

    /// Initialize the module
    fun init_module(sender: &signer) {
        move_to(sender, Registry {
            agent_count: 0,
        });
    }

    /// Register a new AI Agent as an Aptos Object
    public entry fun register_agent(
        account: &signer,
        name: String,
        description: String,
        manifest_url: String,
        capabilities: vector<String>,
        payment_rate: u64,
        payment_endpoint: String
    ) acquires Registry {
        let sender_addr = signer::address_of(account);
        let registry = borrow_global_mut<Registry>(@aether_addr);
        
        let new_id = registry.agent_count + 1;

        // Create the Agent Object
        let constructor_ref = object::create_named_object(account, *std::string::bytes(&name));
        let object_signer = object::generate_signer(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let agent_obj_addr = signer::address_of(&object_signer);

        let agent_card = AgentCard {
            id: new_id,
            owner: sender_addr,
            name,
            description,
            manifest_url,
            capabilities,
            payment_rate,
            payment_endpoint,
            created_at: timestamp::now_seconds(),
            extend_ref,
        };

        move_to(&object_signer, agent_card);
        registry.agent_count = new_id;

        event::emit(AgentRegistered {
            agent_id: new_id,
            agent_obj_addr,
            owner: sender_addr,
            name,
        });
    }

    #[view]
    public fun get_agent_count(): u64 acquires Registry {
        borrow_global<Registry>(@aether_addr).agent_count
    }

    #[view]
    public fun get_agent_card(agent_obj_addr: address): (u64, address, String, String, vector<String>, u64, String) acquires AgentCard {
        let card = borrow_global<AgentCard>(agent_obj_addr);
        (
            card.id,
            card.owner,
            card.name,
            card.manifest_url,
            card.capabilities,
            card.payment_rate,
            card.payment_endpoint
        )
    }
}
