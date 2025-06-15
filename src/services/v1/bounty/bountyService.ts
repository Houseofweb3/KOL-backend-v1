import { AppDataSource } from '../../../config/data-source';
import { Bounty, BountySubmission } from '../../../entity/bounty';
import HttpStatus from 'http-status-codes';

export type BountyStatus =
    | 'open'
    | 'closed'
    | 'draft'
    | 'not_qualified'
    | 'qualified'
    | 'not_winning'
    | 'winning';
type bountyType = 'thread' | 'video' | 'article' | 'meme' | 'twitter' | 'quests';

export interface CreateBountyParams {
    bountyType: bountyType;
    bountyName: string;
    metadata?: Record<string, any>;
    prize?: number;
    yaps: number;
    startDate: Date;
    endDate: Date;
    status?: BountyStatus;
    creatorId?: string;
}

/**
 * Service function to create a new bounty
 */
export async function createBounty(params: CreateBountyParams): Promise<Bounty> {
    try {
        const {
            bountyType,
            bountyName,
            metadata,
            prize,
            endDate,
            status = 'open',
            creatorId,
            yaps,
        } = params;

        // Validate required fields and throw errors with status codes and messages
        if (!bountyType)
            throw { status: HttpStatus.BAD_REQUEST, message: 'Bounty type is required' };
        if (!bountyName)
            throw { status: HttpStatus.BAD_REQUEST, message: 'Bounty name is required' };
        // if (!startDate) throw { status: HttpStatus.BAD_REQUEST, message: 'Start date is required' };

        const now = new Date();
        const start = new Date(now.toISOString());
        const end = new Date(endDate);

        // Comparison in UTC is safe because all Date objects are internally in UTC
        if (start < now && status === 'draft') {
            throw new Error('Start date cannot be in the past for an open bounty');
        }

        if (endDate && end <= start) {
            throw new Error('End date must be after start date');
        }

        const bountyRepository = AppDataSource.getRepository(Bounty);

        const bounty = new Bounty();
        bounty.bountyType = bountyType;
        bounty.bountyName = bountyName;
        bounty.metadata = metadata || {};
        bounty.prize = Number(prize) ?? 0;
        bounty.yaps = yaps;
        bounty.startDate = start;
        bounty.endDate = end;
        bounty.status = status;
        bounty.submissions = 0;

        // Add creator ID if provided
        if (creatorId) {
            bounty.creatorId = creatorId;
        }

        // Save and return the new bounty
        const savedBounty = await bountyRepository.save(bounty);
        return savedBounty;
    } catch (error: any) {
        // Handle errors and throw with status codes and messages
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during bounty creation';
        throw { status: statusCode, message: errorMessage };
    }
}

export enum BountyStatusFilter {
    ALL = 'all',
    OPEN = 'open',
    CLOSED = 'closed',
}

export enum BountySortOption {
    LATEST = 'latest',
    PRIZE = 'prize',
    LAUNCH = 'launchdate',
    BOUNTY = 'bountyvalue',
    EXPIRE = 'expireddate',
}

interface FetchBountiesParams {
    statusFilter?: BountyStatusFilter;
    bountyType?: string;
    sortBy?: BountySortOption;
    page?: number;
    limit?: number;
    notInclude?: string;
    searchTerm?: string;
}

/**
 * Service function to fetch bounties with filtering and sorting options
 */
export async function fetchBounties(params: FetchBountiesParams = {}) {
    try {
        const {
            statusFilter = BountyStatusFilter.ALL,
            bountyType,
            sortBy,
            page = 1,
            limit = 10,
            notInclude,
            searchTerm,
        } = params;

        const offset = (page - 1) * limit;
        const bountyRepository = AppDataSource.getRepository(Bounty);

        //  Auto-close expired bounties (efficient, scoped update)
        const data = await bountyRepository
            .createQueryBuilder()
            .update(Bounty)
            .set({ status: 'closed' })
            .where('status = :status', { status: 'open' })
            .andWhere('endDate IS NOT NULL AND endDate < NOW()')
            .execute();

        //  Start building the filtered query
        const queryBuilder = bountyRepository.createQueryBuilder('bounty');

        if (searchTerm?.trim()) {
            queryBuilder.andWhere('LOWER(bounty.bountyName) LIKE :searchTerm', {
                searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
        }

        if (notInclude && notInclude === 'draft') {
            queryBuilder.andWhere('bounty.status NOT IN (:...statuses)', {
                statuses: [
                    'draft',
                    'not_qualified',
                    'qualified',
                    'not_winning',
                    'winning',
                    'reward',
                    'not_reward',
                ],
            });
        }

        if (statusFilter !== BountyStatusFilter.ALL) {
            if (statusFilter === BountyStatusFilter.OPEN) {
                queryBuilder.andWhere('bounty.status = :status', { status: 'open' });
            } else if (statusFilter === BountyStatusFilter.CLOSED) {
                queryBuilder.andWhere('bounty.status = :status', { status: 'closed' });
            }
        }

        if (bountyType) {
            if (bountyType.includes(',')) {
                const bType = bountyType.split(',');
                queryBuilder.andWhere('bounty.bountyType IN (:...bountyType)', {
                    bountyType: bType,
                });
            } else {
                queryBuilder.andWhere('bounty.bountyType = :bountyType', { bountyType });
            }
        }

        if (sortBy === BountySortOption.LATEST) {
            queryBuilder.orderBy('bounty.startDate', 'DESC');
        } else if (sortBy === BountySortOption.PRIZE) {
            queryBuilder.orderBy('bounty.prize', 'DESC');
        }

        if (notInclude) {
            queryBuilder.addOrderBy('bounty.yaps ', 'ASC');
        } else {
            queryBuilder.addOrderBy('bounty.createdAt', 'DESC');
        }

        queryBuilder.skip(offset).take(limit);

        const [bounties, total] = await queryBuilder.getManyAndCount();

        return {
            bounties,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching bounties';
        throw { status: statusCode, message: errorMessage };
    }
}

export interface BountyWithSubmissions {
    bounty: Bounty | null;
    submissions: BountySubmission[];
}
export interface submissionsBounties {
    bounty: BountySubmission[];
}

export async function fetchBountyById(id: string): Promise<BountyWithSubmissions> {
    try {
        if (!id) {
            throw new Error('Bounty ID is required');
        }

        const bountyRepository = AppDataSource.getRepository(Bounty);

        // Find the bounty by ID
        const bounty = await bountyRepository.findOneBy({ id });
        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        const submissions = await submissionRepo.find({
            where: { bountyId: id },
            relations: ['user'],
        });

        return { bounty, submissions };
    } catch (error) {
        console.error(`Error fetching bounty with ID ${id}:`, error);
        throw new Error(
            `Failed to fetch bounty: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

export interface EditBountyParams {
    bountyType?: string;
    bountyName?: string;
    metadata?: Record<string, any>;
    prize?: number;
    status?: BountyStatus;
    startDate?: Date;
    endDate?: Date | null;
    creatorId?: string;
}

export async function editBounty(id: string, updates: CreateBountyParams): Promise<Bounty> {
    try {
        if (!id) {
            throw new Error('Bounty ID is required');
        }

        // Make sure we have something to update
        if (Object.keys(updates).length === 0) {
            throw new Error('No updates provided');
        }

        const bountyRepository = AppDataSource.getRepository(Bounty);

        // Find the bounty by ID
        const bounty = await bountyRepository.findOneBy({ id });
        const start = updates.startDate ? new Date(updates.startDate) : undefined;
        const end = updates.endDate ? new Date(updates.endDate) : undefined;
        const now = new Date();

        if (updates.startDate !== undefined && start) {
            updates.startDate = start;
        }
        if (updates.endDate !== undefined && end) {
            updates.endDate = end;
        }
        if (start && end && end <= start && now < end) {
            throw new Error('End date must be after start date or current date');
        }

        if (updates?.status === 'open') {
            const now = new Date();
            updates.startDate = now;
        }

        if (!bounty) {
            throw new Error(`Bounty with ID ${id} not found`);
        }
        Object.assign(bounty, updates);

        const updatedBounty = await bountyRepository.save(bounty);

        return updatedBounty;
    } catch (error) {
        console.error(`Error editing bounty with ID ${id}:`, error);
        throw new Error(
            `Failed to edit bounty: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

interface FetchSubmissionBountiesParams {
    userId: string;
    statusFilter?: BountyStatusFilter;
    bountyType?: string;
    sortBy?: BountySortOption;
    page?: number;
    limit?: number;
    notInclude?: string;
}

export async function fetchBountyByUserId(params: FetchSubmissionBountiesParams) {
    try {
        const {
            userId,
            statusFilter = BountyStatusFilter.ALL,
            bountyType,
            sortBy = BountySortOption.LAUNCH,
            page = 1,
            limit = 10,
        } = params;

        const offset = (page - 1) * limit;
        const bountySubmissionRepo = AppDataSource.getRepository(BountySubmission);

        const queryBuilder = bountySubmissionRepo
            .createQueryBuilder('submission')
            .leftJoinAndSelect('submission.bounty', 'bounty')
            .where('submission.userId = :userId', { userId });

        if (bountyType) {
            if (bountyType.includes(',')) {
                const bType = bountyType.split(',');
                queryBuilder.andWhere('bounty.bountyType IN (:...bountyType)', {
                    bountyType: bType,
                });
            } else {
                queryBuilder.andWhere('bounty.bountyType = :bountyType', { bountyType });
            }
        }

        // Filter by status
        if (statusFilter && statusFilter !== BountyStatusFilter.ALL) {
            queryBuilder.andWhere('bounty.status = :status', { status: statusFilter });
        }

        if (sortBy === BountySortOption.LAUNCH) {
            queryBuilder.orderBy('bounty.startDate', 'ASC');
        } else if (sortBy === BountySortOption.EXPIRE) {
            queryBuilder.orderBy('bounty.endDate', 'ASC');
        } else if (sortBy === BountySortOption.BOUNTY) {
            queryBuilder.orderBy('bounty.prize', 'ASC');
        }

        queryBuilder.skip(offset).take(limit);

        const [submissionBounties, total] = await queryBuilder.getManyAndCount();

        return {
            bounty: submissionBounties,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error(`Error fetching bounty for user ${params.userId}:`, error);
        throw new Error(
            `Failed to fetch bounties: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}
