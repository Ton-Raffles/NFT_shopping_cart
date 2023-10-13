import { toNano } from 'ton-core';
import { Cart } from '../wrappers/Cart';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const cart = provider.open(Cart.createFromConfig({}, await compile('Cart')));

    await cart.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(cart.address);

    // run methods on `cart`
}
