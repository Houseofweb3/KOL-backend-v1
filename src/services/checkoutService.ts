import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { InfluencerCart } from '../entity/InfluencerCart';
import { PackageCart } from '../entity/PackageCart';
import { PackageHeader } from '../entity/PackageHeader';
import { CheckoutDetails } from '../entity/CheckoutDetails';
import { UserCheckoutInfluencer } from '../entity/UserCheckoutInfluencer';
import { UserCheckoutPackages } from '../entity/UserCheckoutPackages';
import { v4 as uuidv4 } from 'uuid';

const checkoutService = async (body: any) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);
    const packageCartRepository = AppDataSource.getRepository(PackageCart);
    const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
    const checkoutDetailsRepository = AppDataSource.getRepository(CheckoutDetails);
    const userCheckoutInfluencerRepository = AppDataSource.getRepository(UserCheckoutInfluencer);
    const userCheckoutPackagesRepository = AppDataSource.getRepository(UserCheckoutPackages);

    // Check user existence and status
    const user = await userRepository.findOne({
      where: {
        id: body.user_id,
        status: 'active',
      },
    });

    if (!user) {
      throw new Error('User not found or not active');
    }

    // Fetch selected influencers from cart
    const carts = await influencerCartRepository.find({
      where: {
        user: { id: body.user_id },
      },
      relations: ['influencerPR'],
    });

    // Fetch selected packages from packageCart
    const packageCarts = await packageCartRepository.find({
      where: {
        user: { id: body.user_id },
      },
      relations: ['packageHeader'],
    });

    // Handle case when no items are in both carts and packageCarts
    if (carts.length === 0 && packageCarts.length === 0) {
      throw new Error('No items added in cart or package cart');
    }

    // Initialize influencers and totalPrice
    let influencers = '';
    let totalPrice = 0;

    if (carts.length > 0) {
      influencers = carts.map(cart => cart.influencerPR.name).join(', ');
      totalPrice = carts.reduce((sum, cart) => sum + cart.influencerPR.price, 0);
    }

    if (packageCarts.length > 0) {
      const packageHeaders = await Promise.all(
        packageCarts.map(async packageCart => {
          const header = await packageHeaderRepository.findOne({
            where: {
              id: packageCart.packageHeader.id,
            },
          });
          return header?.header ?? '';
        })
      );

      packageHeaders.forEach(header => {
        if (header) {
          influencers += influencers ? `, ${header}` : header;
          // Calculate total price (assuming cost is a string that needs parsing)
          // totalPrice += parseFloat(header.cost); // Uncomment if 'cost' is a numeric type
        }
      });
    }

    const orderId = uuidv4();

    const checkoutDetails = await checkoutDetailsRepository.save({
      id: orderId,
      user: user,  // Set the user relationship here
      projectName: body.projectName,
      projectURL: body.projectURL,
      firstName: body.firstName,
      lastName: body.lastName || '',
      email: body.email,
      influencers: influencers,
      link: body.link || '',
      status: 'Open',
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      createdDateTime: new Date(),
    });

    // Save cart details to userCheckoutInfluencer
    if (carts.length > 0) {
      await userCheckoutInfluencerRepository.save(
        carts.map(cart => ({
          id: uuidv4(),
          influencers_id: cart.influencerPR.id,
          user: user,  // Set the user relationship here
          order: checkoutDetails,  // Set the order relationship here
          createdDateTime: new Date(),
        }))
      );
    }

    // Save package cart details to userCheckoutPackages
    if (packageCarts.length > 0) {
      await userCheckoutPackagesRepository.save(
        packageCarts.map(packageCart => ({
          id: uuidv4(),
          packages_id: packageCart.packageHeader.id,
          user: user,  // Set the user relationship here
          order: checkoutDetails,  // Set the order relationship here
          createdDateTime: new Date(),
        }))
      );
    }

    return {
      message: 'Data written successfully',
      data: {
        projectName: body.projectName,
        projectURL: body.projectURL,
        firstName: body.firstName,
        lastName: body.lastName || '',
        email: body.email,
        influencers,
        totalPrice: totalPrice.toFixed(2),
        link: body.link || '',
        carts: carts.map(cart => ({
          cart_id: cart.id,
          product_id: cart.influencerPR.id,
        })),
        packageCarts: packageCarts.map(packageCart => ({
          package_cart_id: packageCart.id,
          package_id: packageCart.packageHeader.id,
        })),
      },
    };
  } catch (error) {
    console.error('Error processing request:', error);
    throw new Error('Failed to process the request');
  }
};

export default checkoutService;
