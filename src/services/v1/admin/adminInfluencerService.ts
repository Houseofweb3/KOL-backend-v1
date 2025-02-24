import logger from '../../../config/logger';
import { Influencer } from '../../../entity/influencer';
import { AppDataSource } from '../../../config/data-source';

const DEFAULT_SORT_FIELD = 'credibilityScore';
const DEFAULT_SORT_ORDER = 'DESC';
// service to get all influencers, add sorting and pagination
export const getAllInfluencers = async (
    page: number, 
    limit: number, 
    searchTerm: string = '',
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'ASC' | 'DESC' = DEFAULT_SORT_ORDER,

) => {
    try {
        const query = AppDataSource.getRepository(Influencer)
            .createQueryBuilder('influencer')
            .where('influencer.deleted = :deleted', { deleted: false })
            .andWhere(searchTerm ? 'influencer.name ILIKE :searchTerm' : '1=1', {
                searchTerm: `%${searchTerm}%`,
            });
        // Apply sorting and pagination
        query
            // .orderBy('influencer.tweetScoutScore', 'DESC') // Ensure DESC order and place NULLs last
            .orderBy(`influencer.${sortField}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);
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
    }
    catch (error) {
        logger.error(`Error while fetching all list influencer}`);
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
export const createInfluencer = async (influencers: Influencer[]) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        const newInfluencer = await influencerRepository.save(influencers);
        return newInfluencer;
    } catch (error) {
        logger.error(`Error while creating influencer`);
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

