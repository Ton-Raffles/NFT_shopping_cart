import { Blockchain, SandboxContract, Treasury, TreasuryContract, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, Dictionary, beginCell, toNano } from 'ton-core';
import { Cart } from '../wrappers/Cart';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { NFTCollection } from '../wrappers/NFTCollection';
import { NFTItem } from '../wrappers/NFTItem';
import { FixpriceSale } from '../wrappers/FixpriceSale';
import { randomAddress } from '@ton-community/test-utils';

describe('Cart', () => {
    let code: Cell;
    let codeNFTItem: Cell;
    let codeNFTCollection: Cell;
    let codeFixpriceSale: Cell;

    beforeAll(async () => {
        code = await compile('Cart');
        codeNFTItem = await compile('NFTItem');
        codeNFTCollection = await compile('NFTCollection');
        codeFixpriceSale = await compile('FixpriceSale');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let items: SandboxContract<NFTItem>[];
    let sales: SandboxContract<FixpriceSale>[];

    beforeEach(async () => {
        items = [];
        sales = [];

        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        const collection = blockchain.openContract(
            NFTCollection.createFromConfig(
                {
                    collectionContent: Cell.EMPTY,
                    commonContent: Cell.EMPTY,
                    itemCode: codeNFTItem,
                    owner: deployer.address,
                    royaltyBase: 100n,
                    royaltyFactor: 10000n,
                },
                codeNFTCollection
            )
        );
        await collection.sendDeploy(deployer.getSender(), toNano('0.1'));

        for (let i = 0; i < 255; i++) {
            items.push(
                blockchain.openContract((await collection.sendMint(deployer.getSender(), toNano('0.15'))).result)
            );
            const sale = blockchain.openContract(
                FixpriceSale.createFromConfig(
                    {
                        marketplace: deployer.address,
                        nft: items[i].address,
                        fullPrice: toNano('0.1') * BigInt(i + 1),
                        fees: beginCell()
                            .storeAddress(randomAddress())
                            .storeCoins(0n)
                            .storeAddress(randomAddress())
                            .storeCoins(0n)
                            .endCell(),
                        canDeployByExternal: false,
                    },
                    codeFixpriceSale
                )
            );
            await sale.sendDeploy(deployer.getSender(), toNano('0.05'));
            sales.push(sale);
            await items[i].sendTransfer(deployer.getSender(), toNano('0.05'), sale.address);
            expect(await items[i].getOwner()).toEqualAddress(sale.address);
        }
    });

    it('should purchase 1 nft', async () => {
        let dict = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        dict.set(sales[0].address, toNano('1.2'));
        let total_value = toNano('1.2');
        const cart = blockchain.openContract(
            Cart.createFromConfig({ ownerAddress: deployer.address, nfts: dict }, code)
        );
        const result = await cart.sendBuy(deployer.getSender(), toNano('1.25'), { queryId: 0n });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
            value: (x: bigint | undefined) =>
                x ? x <= toNano('10000') - total_value && x >= toNano('1.25') - total_value - toNano('0.1') : false,
            op: 0x7b,
        });
        expect(result.transactions).toHaveTransaction({
            on: cart.address,
            success: true,
            outMessagesCount: 2,
        });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
        });
        expect(await items[0].getOwner()).toEqualAddress(deployer.address);
    });

    it.only('should purchase 10 nfts', async () => {
        let dict = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        for (let i = 0; i < 10; i++) {
            dict.set(sales[i].address, toNano('1.1') + toNano('0.1') * BigInt(i + 1));
        }
        const cart = blockchain.openContract(
            Cart.createFromConfig({ ownerAddress: deployer.address, nfts: dict }, code)
        );
        const balanceBefore = (await blockchain.getContract(deployer.address)).balance;
        const result = await cart.sendBuy(deployer.getSender(), toNano('10000'), { queryId: 0n });
        expect(result.transactions).toHaveTransaction({
            on: cart.address,
            success: true,
            outMessagesCount: 10,
        });
        for (let i = 0; i < 10; i++) {
            expect(await items[i].getOwner()).toEqualAddress(deployer.address);
        }
        expect((await blockchain.getContract(cart.address)).balance).toEqual(0n);
        const balanceAfter = (await blockchain.getContract(deployer.address)).balance;
        expect(balanceBefore - balanceAfter).toBeLessThan(toNano('0.1') * 10n);
    });

    it('should purchase 100 nfts', async () => {
        let dict = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        let total_value = 0n;
        for (let i = 0; i < 100; i++) {
            dict.set(sales[i].address, toNano('1.1') + toNano('0.1') * BigInt(i + 1));
            total_value += toNano('1.1') + toNano('0.1') * BigInt(i + 1);
        }
        const cart = blockchain.openContract(
            Cart.createFromConfig({ ownerAddress: deployer.address, nfts: dict }, code)
        );
        const result = await cart.sendBuy(deployer.getSender(), toNano('10000'), { queryId: 0n });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
            value: (x: bigint | undefined) =>
                x ? x <= toNano('10000') - total_value && x >= toNano('10000') - total_value - toNano('0.5') : false,
            op: 0x7b,
        });
        expect(result.transactions).toHaveTransaction({
            on: cart.address,
            success: true,
            outMessagesCount: 101,
        });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
        });
        for (let i = 0; i < 100; i++) {
            expect(await items[i].getOwner()).toEqualAddress(deployer.address);
        }
    });

    it('should purchase 253 nfts', async () => {
        let dict = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        let total_value = 0n;
        for (let i = 0; i < 253; i++) {
            dict.set(sales[i].address, toNano('1.1') + toNano('0.1') * BigInt(i + 1));
            total_value += toNano('1.1') + toNano('0.1') * BigInt(i + 1);
        }
        const cart = blockchain.openContract(
            Cart.createFromConfig({ ownerAddress: deployer.address, nfts: dict }, code)
        );
        const result = await cart.sendBuy(deployer.getSender(), toNano('10000'), { queryId: 0n });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
            value: (x: bigint | undefined) =>
                x ? x <= toNano('10000') - total_value && x >= toNano('10000') - total_value - toNano('1') : false,
            op: 0x7b,
        });
        expect(result.transactions).toHaveTransaction({
            on: cart.address,
            success: true,
            outMessagesCount: 254,
        });
        expect(result.transactions).toHaveTransaction({
            from: cart.address,
            to: deployer.address,
        });
        for (let i = 0; i < 253; i++) {
            expect(await items[i].getOwner()).toEqualAddress(deployer.address);
        }
    });

    it('should purchase 50 nfts with 50 failed', async () => {
        const randomWallet = await blockchain.treasury('randomWallet');
        for (let i = 1; i < 100; i += 2) {
            await randomWallet.send({
                to: sales[i].address,
                value: toNano('1.1') + toNano('0.1') * BigInt(i + 1),
            });
        }

        let dict = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.BigVarUint(4));
        for (let i = 0; i < 100; i++) {
            dict.set(sales[i].address, toNano('1.1') + toNano('0.1') * BigInt(i + 1));
        }
        const cart = blockchain.openContract(
            Cart.createFromConfig({ ownerAddress: deployer.address, nfts: dict }, code)
        );
        const result = await cart.sendBuy(deployer.getSender(), toNano('10000'), { queryId: 0n });
        expect(result.transactions).toHaveTransaction({
            on: cart.address,
            success: true,
            outMessagesCount: 101,
        });
        const count = result.transactions.reduce(
            (acc, curr) =>
                curr.inMessage?.info.type == 'internal' &&
                cart.address.equals(curr.inMessage?.info.src) &&
                deployer.address.equals(curr.inMessage?.info.dest)
                    ? acc + 1
                    : acc,
            0
        );
        expect(count).toEqual(52);

        for (let i = 0; i < 100; i++) {
            if (i % 2 == 0) {
                expect(await items[i].getOwner()).toEqualAddress(deployer.address);
            } else {
                expect(await items[i].getOwner()).toEqualAddress(randomWallet.address);
            }
        }
    });
});
