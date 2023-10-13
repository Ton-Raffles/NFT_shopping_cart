import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type CartConfig = {};

export function cartConfigToCell(config: CartConfig): Cell {
    return beginCell().endCell();
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
