import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
} from 'ton-core';

export type CartConfig = {
    nfts: Dictionary<Address, bigint>;
    ownerAddress: Address;
};

export const Opcodes = {
    buy: 0x402eff0b,
};

export function cartConfigToCell(config: CartConfig): Cell {
    return beginCell().storeDict(config.nfts).storeAddress(config.ownerAddress).storeUint(0, 8).endCell();
}

export class Cart implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Cart(address);
    }

    static createFromConfig(config: CartConfig, code: Cell, workchain = 0) {
        const data = cartConfigToCell(config);
        const init = { code, data };
        return new Cart(contractAddress(workchain, init), init);
    }

    async sendBuy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        opts: {
            queryId: bigint;
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(Opcodes.buy, 32).storeUint(opts.queryId, 64).endCell(),
        });
    }
}
