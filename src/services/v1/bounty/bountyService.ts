import { AppDataSource } from '../../../config/data-source';
import { Bounty } from '../../../entity/bounty';
import { User } from '../../../entity/auth/User.entity';
import HttpStatus from 'http-status-codes';

type BountyStatus = "open" | "closed" | "cancelled";

export interface CreateBountyParams {
    bountyType: string;
    bountyName: string;
    metadata?: Record<string, any>;
    prize?: number;
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
            startDate,
            endDate,
            status = "open",
            creatorId
        } = params;

        // Validate required fields and throw errors with status codes and messages
        if (!bountyType) throw { status: HttpStatus.BAD_REQUEST, message: 'Bounty type is required' };
        if (!bountyName) throw { status: HttpStatus.BAD_REQUEST, message: 'Bounty name is required' };
        if (!startDate) throw { status: HttpStatus.BAD_REQUEST, message: 'Start date is required' };

        // Validate dates
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start < now && status === "open") {
            throw new Error('Start date cannot be in the past for an open bounty');
        }

        if (endDate && new Date(endDate) <= start) {
            throw new Error('End date must be after start date');
        }

        // Get repository
        const bountyRepository = AppDataSource.getRepository(Bounty);

        // Create new bounty instance
        const bounty = new Bounty();
        bounty.bountyType = bountyType;
        bounty.bountyName = bountyName;
        bounty.metadata = metadata || {};
        bounty.prize = prize ?? 0; // Default to 0 if prize is undefined
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
    }
    catch (error: any) {
        // Handle errors and throw with status codes and messages
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during bounty creation';
        throw { status: statusCode, message: errorMessage };
    }
}

export enum BountyStatusFilter {
    ALL = 'all',
    OPEN = 'open',
    CLOSED = 'closed'
}

export enum BountySortOption {
    LATEST = 'latest',
    PRIZE = 'prize'
}

interface FetchBountiesParams {
    statusFilter?: BountyStatusFilter;
    bountyType?: string;
    sortBy?: BountySortOption;
    page?: number;
    limit?: number;
}

/**
 * Service function to fetch bounties with filtering and sorting options
 */
export async function fetchBounties(params: FetchBountiesParams = {}) {
    try {
        const {
            statusFilter = BountyStatusFilter.ALL,
            bountyType,
            sortBy = BountySortOption.LATEST,
            page = 1,
            limit = 10
        } = params;

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Start building the query
        const bountyRepository = AppDataSource.getRepository(Bounty);
        const queryBuilder = bountyRepository.createQueryBuilder('bounty');

        // Apply status filter
        if (statusFilter !== BountyStatusFilter.ALL) {
            if (statusFilter === BountyStatusFilter.OPEN) {
                queryBuilder.where('bounty.status = :status', { status: 'open' });
            } else if (statusFilter === BountyStatusFilter.CLOSED) {
                queryBuilder.where('bounty.status = :status', { status: 'closed' });
            }
        }

        // Apply bounty type filter if provided
        if (bountyType) {
            // If we already have a where clause, use andWhere
            if (statusFilter !== BountyStatusFilter.ALL) {
                queryBuilder.andWhere('bounty.bountyType = :bountyType', { bountyType });
            } else {
                queryBuilder.where('bounty.bountyType = :bountyType', { bountyType });
            }
        }

        // Apply sorting
        if (sortBy === BountySortOption.LATEST) {
            queryBuilder.orderBy('bounty.startDate', 'DESC');
        } else if (sortBy === BountySortOption.PRIZE) {
            queryBuilder.orderBy('bounty.prize', 'DESC');
        }

        // Add secondary sort by creation date to ensure consistent ordering
        queryBuilder.addOrderBy('bounty.createdAt', 'DESC');

        // Apply pagination
        queryBuilder.skip(offset).take(limit);

        // Execute query and get total count
        const [bounties, total] = await queryBuilder.getManyAndCount();

        return {
            bounties,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    catch (error: any) {
        // Handle errors and throw with status codes and messages
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching bounties';
        throw { status: statusCode, message: errorMessage };
    }
}


export async function fetchBountyById(id: string): Promise<Bounty | null> {
    try {
        if (!id) {
            throw new Error('Bounty ID is required');
        }

        const bountyRepository = AppDataSource.getRepository(Bounty);

        // Find the bounty by ID
        const bounty = await bountyRepository.findOneBy({ id });

        return bounty;
    } catch (error) {
        console.error(`Error fetching bounty with ID ${id}:`, error);
        throw new Error(`Failed to fetch bounty: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

export async function editBounty(id: string, updates: EditBountyParams): Promise<Bounty> {
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

        if (!bounty) {
            throw new Error(`Bounty with ID ${id} not found`);
        }
        // Apply all other updates
        Object.assign(bounty, updates);

        // Save the updated bounty
        const updatedBounty = await bountyRepository.save(bounty);

        return updatedBounty;
    } catch (error) {
        console.error(`Error editing bounty with ID ${id}:`, error);
        throw new Error(`Failed to edit bounty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
