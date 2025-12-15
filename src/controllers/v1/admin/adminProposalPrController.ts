import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    createProposalPr,
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

// create proposal-pr
export const createProposalPrController = async (req: Request, res: Response) => {
    const { userId, billingInfo, drItems } = req.body;
    try {
        const {
            message,
            checkoutPrId,
            checkoutDetails,
            cartId,
            billingDetailsPrId,
            totalAmount,
            email,
        } = await createProposalPr(userId, billingInfo, drItems);

        // ✅ Send response immediately (DO NOT wait for invoice processing)
        res.status(HttpStatus.CREATED).json({
            message,
            checkoutPrId,
            checkoutDetails,
            cartId,
            billingDetailsPrId,
            totalAmount,
            email,
        });

        // ✅ Process invoice in the background (no `await`, non-blocking)
        fetchInvoiceDetailsPr(
            cartId,
            email,
            billingInfo.managementFeePercentage ?? 0,
            totalAmount,
            billingInfo.discount ?? 5,
            checkoutDetails,
        )
            .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
            .catch((error) =>
                logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`),
            );
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
    const { checkoutPrId, billingInfo, drItems } = req.body;
    try {
        const { message, checkoutDetails, cartId, email, calculatedTotalAmount } =
            await editProposalPr(checkoutPrId, billingInfo, drItems);
        if (cartId && email && billingInfo?.proposalStatus === 'sent') {
            fetchInvoiceDetailsPr(
                cartId,
                email,
                billingInfo.managementFeePercentage ?? 0,
                calculatedTotalAmount,
                billingInfo.discount ?? 5,
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
            const drCartItems = drItemsData.sort(
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

            const templatePath = resolve(__dirname, '../../../templates/invoiceTemplate2.0.ejs');
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

