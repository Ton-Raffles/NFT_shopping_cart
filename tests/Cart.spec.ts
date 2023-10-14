import { Blockchain, SandboxContract, Treasury, TreasuryContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Cart } from '../wrappers/Cart';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { NFTCollection } from '../wrappers/NFTCollection';
import { NFTItem } from '../wrappers/NFTItem';
import { FixpriceSale } from '../wrappers/FixpriceSale';

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
    let items: SandboxContract<NFTItem>[] = [];
    let sales: SandboxContract<FixpriceSale>[] = [];

    beforeEach(async () => {
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

        for (let i = 0; i < 10; i++) {
            items.push(
                blockchain.openContract((await collection.sendMint(deployer.getSender(), toNano('0.1'))).result)
            );
            const sale = blockchain.openContract(
                FixpriceSale.createFromConfig(
                    {
                        marketplace: deployer.address,
                        nft: items[i].address,
                        fullPrice: toNano('0.1'),
                        fees: Cell.EMPTY,
                        canDeployByExternal: false,
                    },
                    codeFixpriceSale
                )
            );
            await sale.sendDeploy(deployer.getSender(), toNano('0.1'));
            sales.push(sale);

            await items[i].sendTransfer(deployer.getSender(), toNano('0.1'), sale.address);
        }
    });

    it('should deploy nfts and put them on sale', async () => {
        // the check is done inside beforeEach
        // blockchain and cart are ready to use
    });
});
