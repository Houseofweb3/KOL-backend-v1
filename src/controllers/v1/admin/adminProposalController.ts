import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    createProposal,
    getProposalDetails,
    editProposal,
    generateInvoicePdf,
    sendInvoiceEmailService,
    getDashboardDetails,
    deleteProposal,
} from '../../../services/v1/admin';
import {
    fetchInvoiceDetails,
    transformData,
} from '../../../services/v1/payment';
import { VALID_TIME_RANGES } from '../../../constants';
import { AppDataSource } from '../../../config/data-source';
import { Cart, InfluencerCartItem, PackageCartItem } from '../../../entity/cart';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { renderFile } from 'ejs';
import { resolve } from 'path';

// create proposal
export const createProposalController = async (req: Request, res: Response) => {
    const { userId, billingInfo, influencerItems } = req.body;
    try {
        const {
            message,
            checkoutId,
            checkoutDetails,
            cartId,
            billingDetailsId,
            totalAmount,
            email,
        } = await createProposal(userId, billingInfo, influencerItems);

        // ✅ Send response immediately (DO NOT wait for invoice processing)
        res.status(HttpStatus.CREATED).json({
            message,
            checkoutId,
            checkoutDetails,
            cartId,
            billingDetailsId,
            totalAmount,
            email,
        });

        // ✅ Process invoice in the background (no `await`, non-blocking)
        fetchInvoiceDetails(
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
        const errorMessage = error.message || 'An unknown error occurred while creating proposal';

        logger.error(`Error while creating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// get proposal details
export const getProposalDetailsController = async (req: Request, res: Response) => {
    const { checkoutId } = req.query;
    try {
        const proposalDetails = await getProposalDetails(checkoutId as string);
        return res.status(HttpStatus.OK).json(proposalDetails);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching proposal details';

        logger.error(`Error while fetching proposal details (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// edit proposal
export const editProposalController = async (req: Request, res: Response) => {
    const { checkoutId, billingInfo, influencerItems } = req.body;
    try {
        const { message, checkoutDetails, cartId, email, calculatedTotalAmount } =
            await editProposal(checkoutId, billingInfo, influencerItems);
        if (cartId && email && billingInfo?.proposalStatus === 'sent') {
            fetchInvoiceDetails(
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

            // send response immediately to proposal re-sent
            res.status(HttpStatus.OK).json({
                message: 'Proposal updated and invoice processing initiated',
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
        const errorMessage = error.message || 'An unknown error occurred while updating proposal';

        logger.error(`Error while updating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

export const downloadProposalController = async (req: Request, res: Response) => {
    const { checkoutId, billingInfo, influencerItems } = req.body;
    try {
        const { message, checkoutDetails, cartId, email, calculatedTotalAmount } = await editProposal(checkoutId, billingInfo, influencerItems);
      
        if (cartId && email) {
            const cartRepository = AppDataSource.getRepository(Cart);
            const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
            const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

            const cart = await cartRepository.findOne({
                where: { id: cartId },
                relations: ['user', 'influencerCartItems', 'packageCartItems', 'checkout'],
            });

            if (!cart) {
                throw new Error(`No cart found for id: ${cartId}`);
            }

            const influencers = await influencerCartItemRepository.find({
                where: { cart: { id: cartId } },
                relations: ['influencer'],
            });
            const influencerCartItems = influencers.sort(
                (a, b) => b?.influencer?.tweetScoutScore - a?.influencer?.tweetScoutScore,
            );

            const packageCartItems = await packageCartItemRepository.find({
                where: { cart: { id: cartId } },
                relations: ['package', 'package.packageItems'],
            });

            const data = {
                user: cart.user, // Assuming Cart has a relation with User
                id: cart.id,
                influencerCartItems,
                packageCartItems,
                managementFeePercentage: billingInfo.managementFeePercentage ?? 0,
                calculatedTotalAmount,
                checkoutDetails,
            };

            const transformCartData = transformData(data);

            const templatePath = resolve(__dirname, '../../../templates/invoiceTemplate2.0.ejs');
            const html = await renderFile(templatePath, transformCartData);

            const pdfBuffer = await convertHtmlToPdfBuffer(html as string);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Ampli5-Proposal.pdf');
            res.send(pdfBuffer);
        } else {
            logger.error('Cart ID or Email is missing for proposal download');
            res.status(HttpStatus.OK).json({
                message,
                checkoutDetails,
            });
        }
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while updating proposal';

        logger.error(`Error while updating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Controller function for the delete proposal endpoint
export const deleteProposalController = async (req: Request, res: Response) => {
    const { checkoutId } = req.params; // Get checkoutId from URL parameters

    try {
        const { message, deletedCheckoutId } = await deleteProposal(checkoutId);

        res.status(HttpStatus.OK).json({
            message,
            deletedCheckoutId,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while deleting the proposal';

        logger.error(`Error while deleting proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// generate invoice pdf

export const generateInvoicePdfController = async (req: Request, res: Response) => {
    const { checkoutId } = req.query;
    const { terms_and_conditions } = req.body;

    try {
        const pdf = await generateInvoicePdf(checkoutId as string, terms_and_conditions);
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

export const sendInvoiceEmailController = async (req: Request, res: Response) => {
    const { checkoutId } = req.body;
    try {
        const response = await sendInvoiceEmailService(checkoutId as string);
        res.json(response);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while generating invoice pdf';

        logger.error(`Error while sending invoice pdf (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Dashboard details
export const dashboardDetails = async (req: Request, res: Response) => {
    try {
        const timeRange = req.query.timeRange as string;

        // Validate time range

        if (!VALID_TIME_RANGES.includes(timeRange)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                error: `Invalid time range. Valid values are: ${VALID_TIME_RANGES.join(', ')}`,
            });
        }

        const dashboardData = await getDashboardDetails(timeRange);
        return res.status(HttpStatus.OK).json(dashboardData);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching dashboard details';

        logger.error(`Error while fetching dashboard details (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
