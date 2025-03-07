import logger from '../../../config/logger';
import { Influencer } from '../../../entity/influencer';
import { AppDataSource } from '../../../config/data-source';
import { normalizeName } from '../../../helpers';

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

