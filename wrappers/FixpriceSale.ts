import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type FixpriceSaleConfig = {
    marketplace: Address;
    nft: Address;
    fullPrice: bigint;
    fees: Cell;
    canDeployByExternal: boolean;
};

export function fixpriceSaleConfigToCell(config: FixpriceSaleConfig): Cell {
    return beginCell()
        .storeBit(false)
        .storeUint(0, 32)
        .storeAddress(config.marketplace)
        .storeAddress(config.nft)
        .storeAddress(undefined)
        .storeCoins(config.fullPrice)
        .storeRef(config.fees)
        .storeBit(config.canDeployByExternal)
        .endCell();
}

export class FixpriceSale implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new FixpriceSale(address);
    }

    static createFromConfig(config: FixpriceSaleConfig, code: Cell, workchain = 0) {
        const data = fixpriceSaleConfigToCell(config);
        const init = { code, data };
        return new FixpriceSale(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
