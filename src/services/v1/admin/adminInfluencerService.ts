import logger from '../../../config/logger';
import { Influencer } from '../../../entity/influencer';
import { AppDataSource } from '../../../config/data-source';


// service to get all influencers, add sorting and pagination
export const getAllInfluencers = async (page: number, limit: number, sort: string, order: string) => {
    try {
        const offset = (page - 1) * limit;
        const influencerRepository = AppDataSource.getRepository(Influencer);
        const influencers = await influencerRepository.find({
            order: {
                [sort]: order
            },
            take: limit,
            skip: offset
        });
        return influencers;
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
export const createInfluencer = async (influencer: Influencer) => {
    const influencerRepository = AppDataSource.getRepository(Influencer);
    try {
        const newInfluencer = await influencerRepository.save(influencer);
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

