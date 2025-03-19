import logger from '../../../config/logger';
import { Influencer } from '../../../entity/influencer';
import { AppDataSource } from '../../../config/data-source';
import { normalizeName } from '../../../helpers';
import { DEFAULT_LIMIT, DEFAULT_PAGE, getFollowerRangeCondition, getHiddenPrice, getPriceRangeCondition } from '../influencer';
import { Brackets, FindOptionsOrder } from 'typeorm';
import { UserOnboardingSelection } from '../../../entity/onboarding';

const DEFAULT_SORT_FIELD = 'credibilityScore';
const DEFAULT_SORT_ORDER = 'DESC';
// service to get all influencers, add sorting and pagination
export const getAllInfluencers = async (
    page: number,
    limit: number,
    searchTerm: string = '',
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'ASC' | 'DESC' = DEFAULT_SORT_ORDER
) => {
    try {
        const query = AppDataSource.getRepository(Influencer)
            .createQueryBuilder('influencer')
            .where('influencer.deleted = :deleted', { deleted: false })
            .andWhere(searchTerm ? 'influencer.name ILIKE :searchTerm' : '1=1', {
                searchTerm: `%${searchTerm}%`,
            });

        // Handle categorical sorting for engagementRate and credibilityScore
        if (['engagementRate', 'credibilityScore'].includes(sortField)) {
            query.orderBy(`
                CASE 
                    WHEN LOWER(influencer.${sortField}) = 'high' THEN 3
                    WHEN LOWER(influencer.${sortField}) = 'medium' THEN 2
                    WHEN LOWER(influencer.${sortField}) = 'low' THEN 1
                    ELSE 0
                END`, sortOrder);
        } else {
            query.orderBy(`influencer.${sortField}`, sortOrder);
        }

        // Apply pagination
        query.skip((page - 1) * limit).take(limit);

        const [influencers, total] = await query.getManyAndCount();

        return {
            influencers,
            pagination: {
                page: page || 1, // Default to page 1
                limit: limit || 10, // Default limit
                total,
                totalPages: limit ? Math.ceil(total / limit) : 1, // Avoid division by zero
            },
        };
    } catch (error) {
        logger.error(`Error while fetching all influencers: ${error}`);
        throw error;
    }
};

// Get unique influencers by socialMediaLink
export const getUniqueInfluencers = async (
    userId: string | undefined,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'ASC' | 'DESC' = DEFAULT_SORT_ORDER,
    searchTerm: string = '',
    filters: Record<string, any> = {},
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
            .getMany();

        // Extract niche, blockchain, and investorType filters
        nicheFilter = userSelections
            .find((selection) =>
                selection.question.onboardingQuestions.some((oq) => oq.order === 1),
            )
            ?.selectedOption.find((option) => option.text)?.text;

        blockchainFilter = userSelections
            .find((selection) =>
                selection.question.onboardingQuestions.some((oq) => oq.order === 2),
            )
            ?.selectedOption.find((option) => option.text)?.text;

        investorTypeFilter = userSelections.flatMap(
            (selection) =>
                selection.selectedOption
                    .filter((option) => option.investorType)
                    .map((option) => option.investorType),
        );
    }

    // Create a subquery to get the first influencer for each unique socialMediaLink
    const subQuery = AppDataSource.getRepository(Influencer)
        .createQueryBuilder('i')
        .select('DISTINCT ON (i.socialMediaLink) i.id')
        .where('i.deleted = :deleted', { deleted: false })
        .andWhere(searchTerm ? 'i.name ILIKE :searchTerm' : '1=1', {
            searchTerm: `%${searchTerm}%`,
        });

    // Apply filters to the subquery
    if (filters.platform && filters.platform.length > 0) {
        subQuery.andWhere('i.platform IN (:...platform)', { platform: filters.platform });
    }

    if (blockchainFilter) {
        subQuery.andWhere('i.blockchain ILIKE :blockchainFilter', {
            blockchainFilter: `%${blockchainFilter}%`,
        });
    } else if (filters.blockchain && filters.blockchain.length > 0) {
        subQuery.andWhere(
            new Brackets((qb) => {
                filters.blockchain.forEach((blockchain: string) => {
                    qb.orWhere('i.blockchain ILIKE :blockchain', {
                        blockchain: `%${blockchain}%`,
                    });
                });
            }),
        );
    }

    if (nicheFilter) {
        subQuery.andWhere(
            new Brackets((qb) => {
                qb.where('i.niche ILIKE :nicheFilter', {
                    nicheFilter: `%${nicheFilter}%`,
                }).orWhere('i.niche2 ILIKE :nicheFilter', {
                    nicheFilter: `%${nicheFilter}%`,
                });
            }),
        );
    }

    if (filters.niche && filters.niche.length > 0) {
        subQuery.andWhere(
            new Brackets((qb) => {
                filters.niche.forEach((nicheValue: string, index: number) => {
                    const paramName = `niche${index}`;
                    qb.orWhere(
                        new Brackets((innerQb) => {
                            innerQb
                                .where(`i.niche ILIKE :${paramName}`, {
                                    [paramName]: `%${nicheValue}%`,
                                })
                                .orWhere(`i.niche2 ILIKE :${paramName}`, {
                                    [paramName]: `%${nicheValue}%`,
                                });
                        }),
                    );
                });
            }),
        );
    }

    if (investorTypeFilter.length > 0) {
        subQuery.andWhere('i.investorType IN (:...investorTypeFilter)', {
            investorTypeFilter,
        });
    }

    // Apply follower range filter
    if (followerRange) {
        const rangeCondition = getFollowerRangeCondition(followerRange);
        if (rangeCondition) {
            subQuery.andWhere(rangeCondition);
        }
    }

    // Apply price range filter
    if (priceRange) {
        const priceCondition = getPriceRangeCondition(priceRange);
        if (priceCondition) {
            subQuery.andWhere(priceCondition);
        }
    }

    // Order by socialMediaLink and the specified sort field to ensure consistent results
    subQuery.orderBy('i.socialMediaLink', 'ASC')
            .addOrderBy(`i.${sortField}`, sortOrder);

    // Main query to get the unique influencers
    const query = AppDataSource.getRepository(Influencer)
        .createQueryBuilder('influencer')
        .where('influencer.id IN (' + subQuery.getQuery() + ')')
        .setParameters(subQuery.getParameters());

    // Apply sorting to main query
    query.orderBy(`influencer.${sortField}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);

    // Execute query and get results
    const [influencers, total] = await query.getManyAndCount();

    // Map results with hidden prices
    const uniqueInfluencers = influencers.map((influencer) => ({
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
        deleted: influencer.deleted,
    }));

    logger.info(
        `Fetched unique influencers for page ${page}, limit ${limit}, search term "${searchTerm}"`,
    );
    return {
        influencers: uniqueInfluencers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};



// service to get influencer by id with try catch block
export const getInfluencerById = async (id: string) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        const influencer = await influencerRepository.findOneOrFail({ where: { id } });
        return influencer;
    } catch (error) {
        logger.error(`Error while fetching influencer with id ${id}`);
        throw error;
    }
};


// service to create influencer with try catch block
// service to create influencer with validation for duplicate name and content type
export const createInfluencer = async (influencers: Influencer[]) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        // Grab all active influencers at once
        const existingInfluencers = await influencerRepository.find({
            where: { deleted: false },
        });

        for (const newInfluencer of influencers) {
            // Transform the new influencer's name by removing whitespaces and making lowercase
            const newInfluencerName = normalizeName(newInfluencer.name)


            // Check if any existing influencer matches BOTH name + contentType
            const duplicateExists = existingInfluencers.some((existing) => {
                const existingName = normalizeName(existing.name)
                return (
                    existingName === newInfluencerName &&
                    existing.contentType === newInfluencer.contentType
                );
            });

            if (duplicateExists) {
                const error = new Error(
                    `Influencer with name "${newInfluencer.name}" and content type "${newInfluencer.contentType}" already exists`,
                );
                (error as any).status = 409; // Conflict
                throw error;
            }
        }

        // If no duplicates, save them all
        const newInfluencers = await influencerRepository.save(influencers);
        return newInfluencers;
    } catch (error) {
        logger.error(`Error while creating influencer: ${error}`);
        throw error;
    }
};


// service to update influencer with try catch block
export const updateInfluencer = async (id: string, influencer: Influencer) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        const data = await influencerRepository.update(id, influencer);
        return data;
    } catch (error) {
        logger.error(`Error while updating influencer with id ${id}`);
        throw error;
    }
};


// service to delete influencer with try catch block
export const deleteInfluencer = async (id: string) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        await influencerRepository.delete(id);
        return true;
    } catch (error) {
        logger.error(`Error while deleting influencer with id ${id}`);
        throw error;
    }
};

