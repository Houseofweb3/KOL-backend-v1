import { AppDataSource } from '../../../config/data-source';
import { Dr } from '../../../entity/dr';
import HttpStatus from 'http-status-codes';

export interface CreateDrParams {
    website: string;
    deliverables: string;
    dr: string;
    price: string;
}

export interface UpdateDrParams {
    website?: string;
    deliverables?: string;
    dr?: string;
    price?: string;
}

/**
 * Create a new Website record
 */
export async function createDr(params: CreateDrParams): Promise<Dr> {
    try {
        const { website, deliverables, dr, price } = params;

        if (!website) throw { status: HttpStatus.BAD_REQUEST, message: 'Website is required' };
        if (!deliverables)
            throw { status: HttpStatus.BAD_REQUEST, message: 'Deliverables are required' };
        if (dr === undefined) throw { status: HttpStatus.BAD_REQUEST, message: 'DR is required' };
        if (price === undefined)
            throw { status: HttpStatus.BAD_REQUEST, message: 'Price is required' };

        const repo = AppDataSource.getRepository(Dr);
        const newWebsite = repo.create({ website, deliverables, dr, price });
        return await repo.save(newWebsite);
    } catch (error: any) {
        throw {
            status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Error creating PR',
        };
    }
}

/**
 * Fetch all websites with pagination
 */
export async function fetchDrs(
    page = 1,
    limit = 10,
    sortField?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    searchTerm?: string,
) {
    try {
        const repo = AppDataSource.getRepository(Dr);
        const queryBuilder = repo.createQueryBuilder('dr');

        // ✅ Search filter across multiple fields
        if (searchTerm) {
            queryBuilder.andWhere(
                `dr.website ILIKE :searchTerm
         OR dr.deliverables ILIKE :searchTerm
         OR dr.dr::text ILIKE :searchTerm
         OR dr.price::text ILIKE :searchTerm`,
                { searchTerm: `%${searchTerm}%` },
            );
        }

        // ✅ Sorting (default: createdAt DESC)
        if (
            sortField &&
            ['website', 'deliverables', 'dr', 'price', 'createdAt'].includes(sortField)
        ) {
            queryBuilder.orderBy(`dr.${sortField}`, sortOrder);
        } else {
            queryBuilder.orderBy('dr.createdAt', 'DESC');
        }

        // ✅ Pagination
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [records, total] = await queryBuilder.getManyAndCount();

        return {
            drs: records,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error: any) {
        throw {
            status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Error fetching PRs',
        };
    }
}


/**
 * Fetch website by ID
 */
export async function fetchDrById(id: string): Promise<Dr | null> {
    try {
        const repo = AppDataSource.getRepository(Dr);
        const website = await repo.findOneBy({ id });
        if (!website) throw { status: HttpStatus.NOT_FOUND, message: 'PR not found' };
        return website;
    } catch (error: any) {
        throw {
            status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Error fetching PR',
        };
    }
}

/**
 * Update website by ID
 */
export async function updateDr(id: string, updates: UpdateDrParams): Promise<Dr> {
    try {
        const repo = AppDataSource.getRepository(Dr);
        const website = await repo.findOneBy({ id });
        if (!website) throw { status: HttpStatus.NOT_FOUND, message: 'PR not found' };

        Object.assign(website, updates);
        return await repo.save(website);
    } catch (error: any) {
        throw {
            status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Error updating PR',
        };
    }
}

/**
 * Delete website by ID
 */
export async function deleteDr(id: string): Promise<{ message: string }> {
    try {
        const repo = AppDataSource.getRepository(Dr);
        const result = await repo.delete(id);
        if (result.affected === 0) {
            throw { status: HttpStatus.NOT_FOUND, message: 'PR not found' };
        }
        return { message: 'PR deleted successfully' };
    } catch (error: any) {
        throw {
            status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Error deleting PR',
        };
    }
}
