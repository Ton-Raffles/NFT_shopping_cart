import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Cart } from '../wrappers/Cart';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Cart', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Cart');
    });

    let blockchain: Blockchain;
    let cart: SandboxContract<Cart>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        cart = blockchain.openContract(Cart.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await cart.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: cart.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and cart are ready to use
    });
});
