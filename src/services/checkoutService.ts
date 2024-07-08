// import { AppDataSource } from '../config/data-source';
// import { v4 as uuidv4 } from 'uuid';
// import { User } from '../entity/auth/User.entity';
// import { InfluencerCart } from '../entity/influencer/InfluencerCart.entity';
// import { PackageCart } from '../entity/package/PackageCart.entity';
// import { CheckoutDetails } from '../entity/CheckoutDetails';
// import { UserCheckoutInfluencer } from '../entity/checkout/UserCheckoutInfluencer.entity';
// import { UserCheckoutPackages } from '../entity/checkout/UserCheckoutPackages.entity';
// import logger from '../config/logger'; 

// export const processCheckout = async (body: any) => {
//   const { user_id, projectName, projectURL, firstName, lastName, email, link } = body;

//   const userRepository = AppDataSource.getRepository(User);
//   const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);
//   const packageCartRepository = AppDataSource.getRepository(PackageCart);
//   const checkoutDetailsRepository = AppDataSource.getRepository(CheckoutDetails);
//   const userCheckoutInfluencerRepository = AppDataSource.getRepository(UserCheckoutInfluencer);
//   const userCheckoutPackagesRepository = AppDataSource.getRepository(UserCheckoutPackages);

//   const user = await userRepository.findOne({ where: { id: String(user_id) } });

//   if (!user || user.status !== 'active') {
//     logger.warn(`User not found or not active: user_id=${user_id}`);
//     throw new Error('User not found or not active');
//   }

//   const carts = await influencerCartRepository.find({ where: { user: { id: String(user_id) } }, relations: ['influencerPR'] });
//   const packageCarts = await packageCartRepository.find({ where: { user: { id: String(user_id) } }, relations: ['packageHeader'] });

//   if (carts.length === 0 && packageCarts.length === 0) {
//     logger.warn(`No items added in the cart for user: ${user_id}`);
//     throw new Error('No item added in a cart');
//   }

//   let influencers = '';
//   let totalPrice = 0;

//   if (carts.length > 0) {
//     influencers = carts.map(cart => cart.influencerPR.name).join(', ');
//     totalPrice += carts.reduce((sum, cart) => sum + cart.influencerPR.price, 0);
//   }

//   if (packageCarts.length > 0) {
//     packageCarts.forEach(packageCart => {
//       const { header, cost } = packageCart.packageHeader;
//       if (header) {
//         influencers += influencers ? `, ${header}` : header;
//       }
//       if (cost) {
//         totalPrice += parseFloat(cost);
//       }
//     });
//   }

//   const orderId = uuidv4();

//   const checkoutDetails = new CheckoutDetails();
//   checkoutDetails.id = orderId;
//   checkoutDetails.user_id = String(user_id);
//   checkoutDetails.projectName = projectName;
//   checkoutDetails.projectURL = projectURL;
//   checkoutDetails.firstName = firstName;
//   checkoutDetails.lastName = lastName || '';
//   checkoutDetails.email = email;
//   checkoutDetails.influencers = influencers;
//   checkoutDetails.link = link || '';
//   checkoutDetails.status = 'Open';
//   checkoutDetails.totalPrice = parseFloat(totalPrice.toFixed(2));
//   checkoutDetails.createdDateTime = new Date();

//   const savedCheckoutDetails = await checkoutDetailsRepository.save(checkoutDetails);
//   logger.info(`Checkout details saved for order: ${orderId}, user: ${user_id}`);

//   if (carts.length > 0) {
//     const userCheckoutInfluencers = carts.map(cart => {
//       const userCheckoutInfluencer = new UserCheckoutInfluencer();
//       userCheckoutInfluencer.id = uuidv4();
//       userCheckoutInfluencer.influencers_id = cart.influencerPRId;
//       userCheckoutInfluencer.user_id = String(user_id); 
//       userCheckoutInfluencer.order_id = orderId;
//       userCheckoutInfluencer.checkoutDetails = savedCheckoutDetails; 
//       userCheckoutInfluencer.createdDateTime = new Date();
//       return userCheckoutInfluencer;
//     });
//     await userCheckoutInfluencerRepository.save(userCheckoutInfluencers);
//     logger.info(`User checkout influencer details saved for order: ${orderId}`);
//   }

//   if (packageCarts.length > 0) {
//     const userCheckoutPackages = packageCarts.map(packageCart => {
//       const userCheckoutPackage = new UserCheckoutPackages();
//       userCheckoutPackage.id = uuidv4();
//       userCheckoutPackage.packages_id = packageCart.packageHeader.id;
//       userCheckoutPackage.user_id = String(user_id); 
//       userCheckoutPackage.order_id = orderId;
//       userCheckoutPackage.checkoutDetails = savedCheckoutDetails; 
//       userCheckoutPackage.createdDateTime = new Date();
//       return userCheckoutPackage;
//     });
//     await userCheckoutPackagesRepository.save(userCheckoutPackages);
//     logger.info(`User checkout packages details saved for order: ${orderId}`);
//   }

//   logger.info(`Checkout process completed for user: ${user_id}, order: ${orderId}`);
//   return {
//     message: 'Details saved successfully 👍',
//   };
// };
