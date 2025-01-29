import fs from 'fs';
import csv from 'csv-parser';
import logger from '../../../config/logger';
import { Influencer } from '../../../entity/influencer';
import {
    UserOnboardingSelection,
    Question,
    Option,
    OnboardingQuestion,
} from '../../../entity/onboarding';
import { AppDataSource } from '../../../config/data-source';
import { FindOptionsOrder } from 'typeorm/find-options/FindOptionsOrder';
import { get } from 'http';
import { Brackets } from 'typeorm';

// Define default values for pagination and sorting
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_FIELD = 'tweetScoutScore';
const DEFAULT_SORT_ORDER = 'DESC';

// range formation for subscribers
const categorizeFollowers = (count: any) => {
    if (count <= 10) return '1-10';
    if (count <= 100) return '11-100';
    if (count <= 1000) return '101-1,000';
    if (count <= 10000) return '1,001-10,000';
    if (count <= 100000) return '10,001-100,000';
    if (count <= 1000000) return '100,001-1,000,000';
    return '1,000,001+';
};

// Range condition to fetch the subcriber list
const getFollowerRangeCondition = (range: string) => {
    switch (range) {
        case '1-10':
            return 'influencer.subscribers BETWEEN 1 AND 10';
        case '11-100':
            return 'influencer.subscribers BETWEEN 11 AND 100';
        case '101-1,000':
            return 'influencer.subscribers BETWEEN 101 AND 1000';
        case '1,001-10,000':
            return 'influencer.subscribers BETWEEN 1001 AND 10000';
        case '10,001-100,000':
            return 'influencer.subscribers BETWEEN 10001 AND 100000';
        case '100,001-1,000,000':
            return 'influencer.subscribers BETWEEN 100001 AND 1000000';
        case '1,000,001+':
            return 'influencer.subscribers > 1000000';
        default:
            return '';
    }
};

const getPriceRangeCondition = (range: string) => {
    switch (range) {
        case '$':
            return 'influencer.price <= 1000';
        case '$$':
            return 'influencer.price > 1000 AND influencer.price <= 2000';
        case '$$$':
            return 'influencer.price > 2000 AND influencer.price <= 3000';
        case '$$$$':
            return 'influencer.price > 3000';
        default:
            return '';
    }
};

interface CSVRow {
    Influencer: string;
    Link: string;
    Category: string;
    TweetScoutScore: number;
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
    Blockchain?: string;
    DpLink?: string; // Added this line
}

const influencerRepository = AppDataSource.getRepository(Influencer);

export const uploadCSV = async (filePath: string) => {
    let insertedRows = 0;
    let skippedRows = 0;
    let skippedReasons: { [key: string]: number } = {};

    try {
        const readStream = fs.createReadStream(filePath).pipe(csv());

        for await (const row of readStream) {
            logger.info('Processing row:', row);

            const capitalizedRow: CSVRow = {
                Influencer: capitalizeWords(row.Influencer || 'N/A'),
                Link: row.Link || 'N/A',
                Category: capitalizeWords(row.Category || 'N/A'),
                TweetScoutScore: parseInt(row.TweetScoutScore || 0),
                CredibilityScore: capitalizeWords(row['Credibilty Score'] || 'N/A'),
                EngagementRate: capitalizeWords(row['Engagement Rate'] || 'N/A'),
                EngagementType: capitalizeWords(row['Engagement Type'] || 'N/A'),
                CollabVelocity: capitalizeWords(row['Collab Velocity'] || 'N/A'),
                ContentType: capitalizeWords(row['Content type'] || 'N/A'),
                Motive: capitalizeWords(row.Motive || 'N/A'),
                Package: capitalizeWords(row.Package || 'N/A'),
                PriceOfPackage: parseFloat(row['Price of Package'] || 0),
                Geography: capitalizeWords(row.Geography || 'N/A'),
                Platform: capitalizeWords(row.Platform || 'N/A'),
                IndividualPrice: parseFloat(row['Individual Price'] || 0),
                Description: row.Description || 'N/A',
                Niche: capitalizeWords(row.Niche || 'N/A'),
                Followers: parseInt(row.Followers || 0),
                InvestorType: capitalizeWords(row['Investor Type'] || 'N/A'),
                Blockchain: row.Blockchain || null,
                DpLink: row['DP link'] || 'N/A', // Added this line
            };

            const existingProduct = await influencerRepository.findOne({
                where: {
                    name: capitalizedRow.Influencer,
                    categoryName: capitalizedRow.Category,
                    subscribers: capitalizedRow.Followers,
                    geography: capitalizedRow.Geography,
                    platform: capitalizedRow.Platform,
                    tweetScoutScore: capitalizedRow.TweetScoutScore,
                    credibilityScore: capitalizedRow.CredibilityScore,
                    engagementRate: capitalizedRow.EngagementRate,
                    investorType: capitalizedRow.InvestorType,
                    price: capitalizedRow.PriceOfPackage,
                    blockchain: capitalizedRow.Blockchain,
                },
            });

            if (existingProduct) {
                skippedRows++;
                skippedReasons['duplicate'] = (skippedReasons['duplicate'] || 0) + 1;
                continue;
            }

            if (!capitalizedRow.IndividualPrice && capitalizedRow.IndividualPrice !== 0) {
                skippedRows++;
                skippedReasons['invalid_price'] = (skippedReasons['invalid_price'] || 0) + 1;
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
                tweetScoutScore: capitalizedRow.TweetScoutScore,
                credibilityScore: capitalizedRow.CredibilityScore,
                engagementRate: capitalizedRow.EngagementRate,
                investorType: capitalizedRow.InvestorType,
                blockchain: capitalizedRow.Blockchain,
                dpLink: capitalizedRow.DpLink, // Added this line
            };

            const newInfluencerPR = influencerRepository.create(dataToInsert);

            await influencerRepository.save(newInfluencerPR);

            insertedRows++;
        }

        logger.info(
            `CSV processed successfully. Inserted: ${insertedRows}, Skipped: ${skippedRows}`,
        );
        return { message: 'CSV processed successfully', insertedRows, skippedRows, skippedReasons };
    } catch (error: any) {
        logger.error('Error saving data from CSV:', error);
        return { status: 500, message: 'Error saving data', error: error.message };
    } finally {
        fs.unlinkSync(filePath);
    }
};

function capitalizeWords(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get influencers with hidden prices, including pagination and sorting
export const getInfluencersWithHiddenPrices = async (
    userId: string | undefined,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'ASC' | 'DESC' = DEFAULT_SORT_ORDER,
    searchTerm: string = '',
    filters: Record<string, any> = {}, // Filters will contain platform and blockchain
    followerRange: string = '',
    priceRange: string = '',
) => {
    const validSortFields = ['price', 'name', 'subscribers', 'categoryName', 'engagementRate'];
    const order: FindOptionsOrder<Influencer> = validSortFields.includes(sortField)
        ? { [sortField]: sortOrder }
        : { [DEFAULT_SORT_FIELD]: DEFAULT_SORT_ORDER };

    let nicheFilter: string | undefined;
    let blockchainFilter: string | undefined;
    let investorTypeFilter: string[] = [];

    if (userId) {
        const userSelections = await AppDataSource.getRepository(UserOnboardingSelection)
            .createQueryBuilder('selection')
            .leftJoinAndSelect('selection.selectedOption', 'option')
            .leftJoinAndSelect('selection.question', 'question')
            .leftJoinAndSelect('question.onboardingQuestions', 'onboardingQuestion')
            .where('selection.user.id = :userId', { userId })
            .orderBy('onboardingQuestion.order', 'ASC')
            .addOrderBy(`influencer.${sortField}`, sortOrder)
            .getMany();

        // Extract niche, blockchain, and investorType filters
        nicheFilter = userSelections
            .find((selection) =>
                selection.question.onboardingQuestions.some((oq) => oq.order === 1),
            )
            ?.selectedOption.find((option) => option.text)?.text; // Accessing text property correctly

        blockchainFilter = userSelections
            .find((selection) =>
                selection.question.onboardingQuestions.some((oq) => oq.order === 2),
            )
            ?.selectedOption.find((option) => option.text)?.text; // Accessing text property correctly

        investorTypeFilter = userSelections.flatMap(
            (selection) =>
                selection.selectedOption
                    .filter((option) => option.investorType) // Filtering options with investorType
                    .map((option) => option.investorType), // Mapping to investorType values
        );
    }

    // Create QueryBuilder instance
    const query = AppDataSource.getRepository(Influencer)
        .createQueryBuilder('influencer')
        .where('influencer.deleted = :deleted', { deleted: false })
        .andWhere(searchTerm ? 'influencer.name ILIKE :searchTerm' : '1=1', {
            searchTerm: `%${searchTerm}%`,
        });

    // Apply platform filter
    if (filters.platform && filters.platform.length > 0) {
        query.andWhere('influencer.platform IN (:...platform)', { platform: filters.platform });
    }

    // Apply blockchain filter
    if (blockchainFilter) {
        query.andWhere('influencer.blockchain ILIKE :blockchainFilter', {
            blockchainFilter: `%${blockchainFilter}%`,
        });
    } else if (filters.blockchain && filters.blockchain.length > 0) {
        query.andWhere(
            new Brackets((qb) => {
                filters.blockchain.forEach((blockchain: string) => {
                    // Explicitly typing blockchain as string
                    qb.orWhere('influencer.blockchain ILIKE :blockchain', {
                        blockchain: `%${blockchain}%`,
                    });
                });
            }),
        );
    }

    // Apply niche filter
    if (nicheFilter) {
        query.andWhere('influencer.niche ILIKE :nicheFilter', { nicheFilter: `%${nicheFilter}%` });
    }

    // Apply investor type filter
    if (investorTypeFilter.length > 0) {
        query.andWhere('influencer.investorType IN (:...investorTypeFilter)', {
            investorTypeFilter,
        });
    }

    // Apply additional filters
    Object.keys(filters).forEach((key) => {
        if (key !== 'platform' && key !== 'blockchain') {
            // Ensure no double processing of platform and blockchain
            if (Array.isArray(filters[key])) {
                query.andWhere(`influencer.${key} IN (:...${key})`, { [key]: filters[key] });
            } else if (filters[key]) {
                query.andWhere(`influencer.${key} = :${key}`, { [key]: filters[key] });
            }
        }
    });

    // Apply sorting and pagination
    query
        // .orderBy('influencer.tweetScoutScore', 'DESC') // Ensure DESC order and place NULLs last
        .orderBy(`influencer.${sortField}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);

    // Apply follower range filter
    if (followerRange) {
        const rangeCondition = getFollowerRangeCondition(followerRange);
        if (rangeCondition) {
            query.andWhere(rangeCondition);
        }
    }

    // Apply price range filter
    if (priceRange) {
        const priceCondition = getPriceRangeCondition(priceRange);
        if (priceCondition) {
            query.andWhere(priceCondition);
        }
    }

    // Execute query and get results
    const [influencers, total] = await query.getManyAndCount();

    // Map results with hidden prices
    const influencersWithHiddenPrices = influencers.map((influencer) => ({
        id: influencer.id,
        influencer: influencer.name,
        followers: influencer.subscribers,
        socialMediaLink: influencer.socialMediaLink,
        categoryName: influencer.categoryName,
        engagementRate: influencer.engagementRate,
        niche:
            influencer.niche2 !== null
                ? influencer.niche + ',' + influencer.niche2
                : influencer.niche,
        credibilityScore: influencer.credibilityScore,
        geography: influencer.geography,
        platform: influencer.platform,
        price: influencer.price,
        hiddenPrice: getHiddenPrice(influencer.price),
        blockchain: influencer.blockchain,
        dpLink: influencer.dpLink,
        tweetScoutScore: influencer.tweetScoutScore,
        contentType: influencer.contentType,
        deleted: influencer.deleted
    }));

    logger.info(
        `Fetched influencers with hidden prices for page ${page}, limit ${limit}, search term "${searchTerm}"`,
    );
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

export const getFilterOptions = async () => {
    try {
        const influencerRepository = AppDataSource.getRepository(Influencer);

        // Fetch unique values for influencer filters
        const credibilityScores = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.credibilityScore)', 'credibilityScore')
            .getRawMany();

        const engagementRates = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.engagementRate)', 'engagementRate')
            .getRawMany();

        const niches = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.niche)', 'niche')
            .getRawMany();

        const locations = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.geography)', 'geography')
            .getRawMany();

        const platforms = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.platform)', 'platform')
            .getRawMany();

        const platformContentTypes = await influencerRepository
            .createQueryBuilder('influencer')
            .select(['influencer.platform', 'ARRAY_AGG(DISTINCT influencer.contentType) AS contentTypes'])
            .where('influencer.platform IS NOT NULL AND influencer.contentType IS NOT NULL')
            .groupBy('influencer.platform')
            .getRawMany();


        const subscribers = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.subscribers)', 'subscribers')
            .getRawMany();

        const prices = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.price)', 'price')
            .getRawMany();

        const blockchains = await influencerRepository
            .createQueryBuilder('influencer')
            .select('DISTINCT(influencer.blockchain)', 'blockchain')
            .getRawMany();

        const hiddenPrices = prices
            .map((row) => getHiddenPrice(row.price))
            .filter((price) => price);

        const followerRanges = subscribers.map((row) => {
            const range = categorizeFollowers(row.subscribers);
            logger.info(`Follower count: ${row.subscribers}, categorized as: ${range}`);
            return range;
        });

        // Process blockchains to remove duplicates and split combined entries
        const blockchainSet = new Set<string>(); // Explicitly type the set
        blockchains.forEach((row) => {
            if (row.blockchain) {
                // Check if blockchain is not null or undefined
                const chains = row.blockchain.split(',').map((chain: string) => chain.trim());
                chains.forEach((chain: string) => {
                    if (chain !== 'N/a' && chain !== '') {
                        blockchainSet.add(chain);
                    }
                });
            }
        });

        return {
            credibilityScores: credibilityScores
                .map((row) => row.credibilityScore)
                .filter((el) => el !== 'N/a' && el !== null),
            engagementRates: engagementRates
                .map((row) => row.engagementRate)
                .filter((el) => el !== 'N/a' && el !== null),
            niches: niches.map((row) => row.niche).filter((el) => el !== 'N/a' && el !== null),
            locations: locations
                .map((row) => row.geography)
                .filter((el) => el !== 'N/a' && el !== null),
            platforms: platforms
                .map((row) => row.platform)
                .filter((el) => el !== 'N/a' && el !== null),
            platformsWithContentTypes: platformContentTypes.map((row) => ({
                platform: row.influencer_platform, // Ensure lowercase field name
                contentTypes: row.contenttypes, // Ensure lowercase field name
            })),
            followerRanges: Array.from(new Set(followerRanges)).sort((a, b) => {
                const rangeOrder = [
                    '1-10',
                    '11-100',
                    '101-1,000',
                    '1,001-10,000',
                    '10,001-100,000',
                    '100,001-1,000,000',
                    '1,000,001+',
                ];
                return rangeOrder.indexOf(a) - rangeOrder.indexOf(b);
            }),
            hiddenPrices: Array.from(new Set(hiddenPrices)).sort((a, b) => {
                const rangeOrder = ['$', '$$', '$$$', '$$$$'];
                return rangeOrder.indexOf(a) - rangeOrder.indexOf(b);
            }),
            blockchains: Array.from(blockchainSet).sort(),
        };
    } catch (error: any) {
        throw new Error(`Error fetching filter options: ${error.message}`);
    }
};

const getHiddenPrice = (price: number): string => {
    if (price <= 1000) return '$';
    if (price > 1000 && price <= 2000) return '$$';
    if (price > 2000 && price <= 3000) return '$$$';
    if (price > 3000) return '$$$$';
    return '';
};

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
};

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
