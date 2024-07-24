import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { Checkout } from '../../../entity/checkout';
import { AppDataSource } from '../../../config/data-source';

const checkoutRepository = AppDataSource.getRepository(Checkout);
const cartRepository = AppDataSource.getRepository(Cart);

// Create a new Checkout
export const createCheckout = async (cartId: string, totalAmount: number): Promise<Checkout> => {
    try {
        const cart = await cartRepository.findOne({ where: { id: cartId } });

        if (!cart) {
            throw new Error('Cart not found');
        }
        const newCheckout = checkoutRepository.create({ cart, totalAmount });
        await checkoutRepository.save(newCheckout);
        logger.info(`Created new checkout with id ${newCheckout.id}`);
        return newCheckout;
    } catch (error) {
        logger.error(`Error creating checkout: ${error}`);
        throw new Error('Error creating checkout');
    }
};

// Get Checkout by ID
export const getCheckoutById = async (id: string): Promise<Checkout | null> => {
    try {
        const checkout = await checkoutRepository.findOne({ where: { id }, relations: ['cart'] });
        return checkout;
    } catch (error) {
        logger.error(`Error fetching checkout with id ${id}: ${error}`);
        throw new Error('Error fetching checkout');
    }
};

// Delete a Checkout
export const deleteCheckout = async (id: string): Promise<void> => {
    try {
        await checkoutRepository.delete({ id });
        logger.info(`Deleted checkout with id ${id}`);
    } catch (error) {
        logger.error(`Error deleting checkout with id ${id}: ${error}`);
        throw new Error('Error deleting checkout');
    }
};
