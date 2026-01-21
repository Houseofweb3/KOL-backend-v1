import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    getProposalPrDetails,
    editProposalPr,
    generateInvoicePdfPr,
    sendInvoiceEmailServicePr,
    deleteProposalPr,
} from '../../../services/v1/admin/adminProposalPrService';
import { fetchInvoiceDetailsPr } from '../../../services/v1/payment/invoiceServicePr';
import { transformDataPr } from '../../../services/v1/payment/invoiceServicePrTransform';
import { AppDataSource } from '../../../config/data-source';
import { Cart, DrCartItem, PackageCartItem } from '../../../entity/cart';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { renderFile } from 'ejs';
import { resolve } from 'path';
import { createProposalPrToken } from '../../../services/v1/admin/proposalPrTokenService';
import { updateProposalPrTokenAndSendEmail } from '../../../services/v1/admin/proposalPrTokenService';
import { User } from '../../../entity/auth';

// create proposal-pr - Now generates token and sends email instead of creating proposal-pr directly
export const createProposalPrController = async (req: Request, res: Response) => {
    const { userId, billingInfo, drItems, email } = req.body;
    try {
        // Get user email if not provided
        let clientEmail = email;
        if (!clientEmail) {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw { status: HttpStatus.NOT_FOUND, message: 'User not found' };
            }
            clientEmail = user.email;
        }

        // Generate token and send email with link
        const { message, token, expiresAt, cartId } = await createProposalPrToken(
            userId,
            billingInfo,
            drItems,
            clientEmail,
        );

        // ✅ Send response immediately
        res.status(HttpStatus.CREATED).json({
            message,
            token,
            expiresAt,
            cartId,
            email: clientEmail,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while creating proposal-pr';

        logger.error(`Error while creating proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// get proposal-pr details
export const getProposalPrDetailsController = async (req: Request, res: Response) => {
    const { checkoutPrId } = req.query;
    try {
        const proposalDetails = await getProposalPrDetails(checkoutPrId as string);
        return res.status(HttpStatus.OK).json(proposalDetails);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching proposal-pr details';

        logger.error(`Error while fetching proposal-pr details (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// edit proposal-pr
export const editProposalPrController = async (req: Request, res: Response) => {
    console.log("editProposalPrController", "-----------------------------------------------------");
    const { checkoutPrId, billingInfo, drItems } = req.body;
    try {

        const { message, checkoutDetails, cartId, email, calculatedTotalAmount, subtotal, discount, discountAmount } =
            await editProposalPr(checkoutPrId, billingInfo, drItems);

        if (cartId && email && billingInfo?.proposalStatus === 'sent') {
            fetchInvoiceDetailsPr(
                cartId,
                email,
                billingInfo.managementFeePercentage ?? 0,
                calculatedTotalAmount,
                billingInfo.discount || 0,
                checkoutDetails,

            )
                .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
                .catch((error) =>
                    logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`),
                );

            // send response immediately to proposal-pr re-sent
            res.status(HttpStatus.OK).json({
                message: 'Proposal-pr updated and invoice processing initiated',
                checkoutDetails,
            });
        } else {
            res.status(HttpStatus.OK).json({
                message,
                checkoutDetails,
            });
        }
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while updating proposal-pr';

        logger.error(`Error while updating proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// sent proposal-pr edit proposal-pr
export const updateSentProposalPrController = async (req: Request, res: Response) => {
    console.log("updateSentProposalPrController", "-----------------------------------------------------");

    const { checkoutPrId, billingInfo, drItems } = req.body;
    try {

        const result = await updateProposalPrTokenAndSendEmail(checkoutPrId, billingInfo, drItems);
        const { message, token, expiresAt, checkoutDetails, cartId, calculatedTotalAmount, email } = result;

        // ✅ Send response immediately
        res.status(HttpStatus.OK).json({
            message,
            token,
            expiresAt,
            checkoutDetails,
            cartId,
            calculatedTotalAmount,
            email,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while updating and resending proposal-pr';

        logger.error(`Error while updating and resending proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

export const downloadProposalPrController = async (req: Request, res: Response) => {
    const { checkoutPrId, billingInfo, drItems } = req.body;
    try {
        const { message, checkoutDetails, cartId, email, calculatedTotalAmount } = await editProposalPr(checkoutPrId, billingInfo, drItems);
      
        if (cartId && email) {
            const cartRepository = AppDataSource.getRepository(Cart);
            const drCartItemRepository = AppDataSource.getRepository(DrCartItem);
            const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

            const cart = await cartRepository.findOne({
                where: { id: cartId },
                relations: ['user', 'drCartItems', 'packageCartItems', 'checkoutPr'],
            });

            if (!cart) {
                throw new Error(`No cart found for id: ${cartId}`);
            }

            const drItemsData = await drCartItemRepository.find({
                where: { cart: { id: cartId } },
                relations: ['dr'],
            });
            // Ensure quantity is properly set for each item (default to 1 if not set)
            const drCartItemsWithQuantity = drItemsData.map(item => ({
                ...item,
                quantity: item.quantity ?? 1, // Explicitly set quantity from cart item
            }));
            const drCartItems = drCartItemsWithQuantity.sort(
                (a, b) => parseFloat(b?.price?.toString() || '0') - parseFloat(a?.price?.toString() || '0'),
            );

            const packageCartItems = await packageCartItemRepository.find({
                where: { cart: { id: cartId } },
                relations: ['package', 'package.packageItems'],
            });

            const data = {
                user: cart.user, // Assuming Cart has a relation with User
                id: cart.id,
                drCartItems,
                packageCartItems,
                managementFeePercentage: billingInfo.managementFeePercentage ?? 0,
                calculatedTotalAmount,
                checkoutDetails,
            };

            const transformCartData = transformDataPr(data);

            const templatePath = resolve(__dirname, '../../../templates/invoicePrTemplate2.0.ejs');
            const html = await renderFile(templatePath, transformCartData);

            const pdfBuffer = await convertHtmlToPdfBuffer(html as string);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Ampli5-Proposal-Pr.pdf');
            res.send(pdfBuffer);
        } else {
            logger.error('Cart ID or Email is missing for proposal-pr download');
            res.status(HttpStatus.OK).json({
                message,
                checkoutDetails,
            });
        }
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while updating proposal-pr';

        logger.error(`Error while updating proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Controller function for the delete proposal-pr endpoint
export const deleteProposalPrController = async (req: Request, res: Response) => {
    const { checkoutPrId } = req.params; // Get checkoutPrId from URL parameters

    try {
        const { message, deletedCheckoutPrId } = await deleteProposalPr(checkoutPrId);

        res.status(HttpStatus.OK).json({
            message,
            deletedCheckoutPrId,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while deleting the proposal-pr';

        logger.error(`Error while deleting proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// generate invoice pdf

export const generateInvoicePdfPrController = async (req: Request, res: Response) => {
    const { checkoutPrId } = req.query;
    const { terms_and_conditions } = req.body;

    try {
        const pdf = await generateInvoicePdfPr(checkoutPrId as string, terms_and_conditions);
        res.json(pdf);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while generating invoice pdf';

        logger.error(`Error while generating invoice pdf (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// send invoice email

export const sendInvoiceEmailPrController = async (req: Request, res: Response) => {
    const { checkoutPrId } = req.body;
    try {
        const response = await sendInvoiceEmailServicePr(checkoutPrId as string);
        res.json(response);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while generating invoice pdf';

        logger.error(`Error while sending invoice pdf (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

