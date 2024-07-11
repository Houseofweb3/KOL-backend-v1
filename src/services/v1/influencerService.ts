import fs from 'fs';
import csv from 'csv-parser';
import { AppDataSource } from '../../config/data-source';
import { Influencer } from '../../entity/influencer';
import { User } from '../../entity/auth';
import logger from '../../config/logger';
import { FindOptionsOrder } from 'typeorm/find-options/FindOptionsOrder';

// Define default values for pagination and sorting
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_FIELD = 'price';
const DEFAULT_SORT_ORDER = 'asc';

interface CSVRow {
    Influencer: string;
    Link: string;
    Category: string;
    CredibilityScore: string;
    EngagementRate: string;
    EngagementType: string;
    CollabVelocity: string;
    ContentType: string;
    Motive: string;
    Package: string;
    PriceOfPackage: number;
    Geography: string;
    Platform: string;
    IndividualPrice: number;
    Description: string;
    Niche: string;
    Followers: number;
    InvestorType: string;
}

const userRepository = AppDataSource.getRepository(User);
const influencerRepository = AppDataSource.getRepository(Influencer);


export const uploadCSV = async (filePath: string) => {

    let insertedRows = 0;
    let skippedRows = 0;
    let skippedReasons: { [key: string]: number } = {};

    try {

        const readStream = fs.createReadStream(filePath).pipe(csv());

        for await (const row of readStream) {
            console.log("Processing row:", row);

            const capitalizedRow: CSVRow = {
                Influencer: capitalizeWords(row.Influencer || "N/A"),
                Link: row.Link || "N/A",
                Category: capitalizeWords(row.Category || "N/A"),
                CredibilityScore: capitalizeWords(row['Credibilty Score'] || "N/A"),
                EngagementRate: capitalizeWords(row['Engagement Rate'] || "N/A"),
                EngagementType: capitalizeWords(row['Engagement Type'] || "N/A"),
                CollabVelocity: capitalizeWords(row['Collab Velocity'] || "N/A"),
                ContentType: capitalizeWords(row['Content type'] || "N/A"),
                Motive: capitalizeWords(row.Motive || "N/A"),
                Package: capitalizeWords(row.Package || "N/A"),
                PriceOfPackage: parseFloat(row['Price of Package'] || 0),
                Geography: capitalizeWords(row.Geography || "N/A"),
                Platform: capitalizeWords(row.Platform || "N/A"),
                IndividualPrice: parseFloat(row['Individual Price'] || 0),
                Description: row.Description || "N/A",
                Niche: capitalizeWords(row.Niche || "N/A"),
                Followers: parseInt(row.Followers || 0),
                InvestorType: capitalizeWords(row['Investor Type'] || "N/A"),
            };

            const existingProduct = await influencerRepository.findOne({
                where: {
                    name: capitalizedRow.Influencer,
                    categoryName: capitalizedRow.Category,
                    subscribers: capitalizedRow.Followers,
                    geography: capitalizedRow.Geography,
                    platform: capitalizedRow.Platform,
                    credibilityScore: capitalizedRow.CredibilityScore,
                    engagementRate: capitalizedRow.EngagementRate,
                    //   engagement_type: capitalizedRow.EngagementType,
                    //   collab_velocity: capitalizedRow.CollabVelocity,
                    //   content_type: capitalizedRow.ContentType,
                    //   motive: capitalizedRow.Motive,
                    //   packages: capitalizedRow.Package,
                    investorType: capitalizedRow.InvestorType,
                    price: capitalizedRow.PriceOfPackage // need to discss
                    //   link: capitalizedRow.Link,
                },
            });

            if (existingProduct) {
                skippedRows++;
                skippedReasons["duplicate"] = (skippedReasons["duplicate"] || 0) + 1;
                continue;
            }

            if (!capitalizedRow.IndividualPrice && capitalizedRow.IndividualPrice !== 0) {
                skippedRows++;
                skippedReasons["invalid_price"] = (skippedReasons["invalid_price"] || 0) + 1;
                continue;
            }
            const dataToInsert = {
                niche: capitalizedRow.Niche,
                name: capitalizedRow.Influencer,
                categoryName: capitalizedRow.Category,
                subscribers: capitalizedRow.Followers,
                geography: capitalizedRow.Geography,
                platform: capitalizedRow.Platform,
                price: capitalizedRow.IndividualPrice,
                credibilityScore: capitalizedRow.CredibilityScore,
                engagementRate: capitalizedRow.EngagementRate,
                investorType: capitalizedRow.InvestorType,
            }
            // logger.info("dataToInsert: ", dataToInsert)
            const newInfluencerPR = influencerRepository.create(dataToInsert);

            await influencerRepository.save(newInfluencerPR);

            insertedRows++;
        }

        logger.info(`CSV processed successfully. Inserted: ${insertedRows}, Skipped: ${skippedRows}`);
        return { message: "CSV processed successfully", insertedRows, skippedRows, skippedReasons };
    } catch (error: any) {
        logger.error('Error saving data from CSV:', error);
        return { status: 500, message: "Error saving data", error: error.message };
    } finally {
        fs.unlinkSync(filePath);
    }
};

function capitalizeWords(str: string): string {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


// Get influencers with hidden prices, including pagination and sorting
export const getInfluencersWithHiddenPrices = async (
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER
) => {
    const validSortFields = ['price', 'name', 'subscribers', 'categoryName', 'engagementRate'];
    const order: FindOptionsOrder<Influencer> = validSortFields.includes(sortField)
        ? { [sortField]: sortOrder }
        : { [DEFAULT_SORT_FIELD]: DEFAULT_SORT_ORDER };

    const [influencers, total] = await influencerRepository.findAndCount({
        where: {},
        order,
        take: limit,
        skip: (page - 1) * limit,
    });

    const influencersWithHiddenPrices = influencers.map(influencer => ({
        ...influencer,
        hiddenPrice: getHiddenPrice(influencer.price),
    }));

    logger.info(`Fetched influencers with hidden prices for page ${page}, limit ${limit}`);
    return {
        influencers: influencersWithHiddenPrices,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


const getHiddenPrice = (price: number): string => {
    if (price <= 1000) return '$';
    if (price > 1000 && price <= 2000) return '$$';
    if (price > 2000 && price <= 3000) return '$$$';
    if (price > 3000) return '$$$$';
    return '';
};

// create inflencers
export const createInfluencer = async (data: Partial<Influencer>) => {
    try {
        const newInfluencer = influencerRepository.create(data);
        await influencerRepository.save(newInfluencer);

        logger.info(`Influencer created successfully: ${newInfluencer.id}`);
        return { influencer: newInfluencer, message: 'Influencer created successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating influencer: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }
    }
}


// Delete inflencers
export const deleteInfluencer = async (id: string) => {
    try {
        const influencer = await influencerRepository.findOneBy({ id });
        if (!influencer) {
            throw new Error('Influencer not found');
        }
        await influencerRepository.remove(influencer);
        logger.info(`Influencer deleted successfully: ${id}`);
        return { message: 'Influencer deleted successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting influencer: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};