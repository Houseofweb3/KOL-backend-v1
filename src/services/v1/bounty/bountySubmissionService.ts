import { AppDataSource } from '../../../config/data-source';
import { Bounty, BountySubmission } from '../../../entity/bounty';
import { User } from '../../../entity/auth';

interface CreateBountySubmissionParams {
    userId: string;
    bountyId: string;
    submissionLink: string;
}

/**
 * Service function to create a bounty submission
 */
export async function createBountySubmission(
    params: CreateBountySubmissionParams,
): Promise<BountySubmission> {
    try {
        const { userId, bountyId, submissionLink } = params;

        // Validate required fields
        if (!userId) throw new Error('User ID is required');
        if (!bountyId) throw new Error('Bounty ID is required');
        if (!submissionLink) throw new Error('Submission link is required');

        // Validate the link format
        try {
            new URL(submissionLink);
        } catch (error) {
            throw new Error('Invalid submission link format');
        }

        // Get repositories
        const bountyRepo = AppDataSource.getRepository(Bounty);
        const userRepo = AppDataSource.getRepository(User);
        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        // Check if bounty exists and is open
        const bounty = await bountyRepo.findOneBy({ id: bountyId });
        if (!bounty) {
            throw new Error(`Bounty with ID ${bountyId} not found`);
        }

        // Check if bounty is open for submissions
        if (bounty.status !== 'open') {
            throw new Error(`Bounty is not open for submissions. Current status: ${bounty.status}`);
        }

        // Check if user exists
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Check if user already submitted to this bounty
        const existingSubmission = await submissionRepo.findOneBy({
            userId,
            bountyId,
        });

        if (existingSubmission) {
            throw new Error('You have already submitted to this bounty');
        }

        // Create the submission
        const submission = new BountySubmission();
        submission.userId = userId;
        submission.bountyId = bountyId;
        submission.submissionLink = submissionLink;
        submission.status = 'under_review';

        // Save the submission
        const savedSubmission = await submissionRepo.save(submission);

        // Update bounty submission count
        bounty.submissions += 1;
        await bountyRepo.save(bounty);

        return savedSubmission;
    } catch (error) {
        console.error('Error creating bounty submission:', error);
        throw new Error(
            `Failed to create bounty submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

// fn to fetch all submissions for a bounty
export async function fetchBountySubmissionsForAdmin(
    bountyId: string,
    page: number,
    limit: number,
    searchTerm?: string,
    status?: string,
): Promise<{
    submissions: BountySubmission[];
    bounty: Bounty;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const offset = (page - 1) * limit;

        const BountyRepo = AppDataSource.getRepository(Bounty);
        const bounty = await BountyRepo.findOneBy({ id: bountyId });
        if (!bounty) {
            throw new Error(`Bounty with ID ${bountyId} not found`);
        }
        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        // Use QueryBuilder for flexible search
        const count = await submissionRepo
            .createQueryBuilder('submission')
            .where('submission.bountyId = :bountyId', { bountyId })
            .andWhere("submission.status NOT IN ('approved', 'rejected', 'reword_distributed')")
            .getCount();

        const qb = submissionRepo
            .createQueryBuilder('submission')
            .leftJoinAndSelect('submission.user', 'user')
            .leftJoinAndSelect('submission.bounty', 'bounty')
            .where('submission.bountyId = :bountyId', { bountyId });

        if (searchTerm) {
            qb.andWhere(
                '(user.fullname ILIKE :searchTerm OR user.first_name ILIKE :searchTerm OR user.last_name ILIKE :searchTerm)',
                { searchTerm: `%${searchTerm}%` },
            );
        }

        const [submissions, total] = await qb.skip(offset).take(limit).getManyAndCount();

        return {
            submissions,
            bounty,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(
            `Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

// areAllSubmissionsApprovedOrRejectedOrWinner for admin
export async function fetchBountyVerifySubmissionsForAdmin(bountyId: string): Promise<{
    areAllSubmissionsApprovedOrRejectedOrWinner: Boolean;
}> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        const count = await submissionRepo
            .createQueryBuilder('submission')
            .where('submission.bountyId = :bountyId', { bountyId })
            .andWhere("submission.status NOT IN ('approved', 'rejected', 'reword_not_distributed','reword_distributed')")
            .getCount();

        return { areAllSubmissionsApprovedOrRejectedOrWinner: count === 0 };
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(
            `Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}


// areAllSubmissionsWinnORnot for admin


export async function fetchBountyQualifiedSubmissionsForAdmin(bountyId: string): Promise<{
    reword_distributed: Boolean;
    reword_not_distributed: Boolean;
    isallrewordDecared: Boolean;
}> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        const submissiions = await submissionRepo
            .createQueryBuilder('submission')
            .where('submission.bountyId = :bountyId', { bountyId })
            .andWhere("submission.status IN ( 'reword_not_distributed' , 'reword_distributed')")
            .getMany();

        const statuses = submissiions.map((s) => s.status);

        const reword_distributed = statuses.includes('reword_distributed');
        const reword_not_distributed = statuses.includes('reword_not_distributed');
        const lessSubmission = statuses.length <= 10 ? statuses.length == statuses.filter((s) => s === 'reword_distributed').length : false;
        const isallrewordDecared = statuses.length > 0 ? statuses.filter((s) => s === 'reword_distributed').length >= 10 : false;

        return { reword_distributed, reword_not_distributed, isallrewordDecared: lessSubmission || isallrewordDecared };
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(
            `Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

export async function fetchBountySubmissions(bountyId: string): Promise<BountySubmission[]> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        const submissions = await submissionRepo.find({
            where: { bountyId },
            relations: ['user', 'bounty'],
        });

        return submissions;
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(
            `Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

export async function fetchBountySubmissionsByStatus(userId: string): Promise<BountySubmission[]> {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        const statusCounts = await submissionRepo
            .createQueryBuilder('submission')
            .select('submission.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('submission.userId = :userId', { userId })
            .groupBy('submission.status')
            .getRawMany();

        return statusCounts;
    } catch (error) {
        console.error(`Error fetching bounty ${userId}:`, error);
        throw new Error(
            `Failed to fetch bounty: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

// editBountySubmission function to edit a submission, with link, sbmittedAt and reviewedAt
export async function editBountySubmission(
    submissionId: string,
    updates: Partial<BountySubmission>,
): Promise<BountySubmission> {
    try {
        if (!submissionId) {
            throw new Error('Submission ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        // Find the submission by ID
        const submission = await submissionRepo.findOneBy({ id: submissionId });
        if (!submission) {
            throw new Error(`Submission with ID ${submissionId} not found`);
        }

        // Apply updates
        Object.assign(submission, updates);

        // Save the updated submission
        const updatedSubmission = await submissionRepo.save(submission);

        return updatedSubmission;
    } catch (error) {
        console.error(`Error editing submission with ID ${submissionId}:`, error);
        throw new Error(
            `Failed to edit submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}


export async function editClientBountySubmission(
    submissionId: string,
    updates: Partial<BountySubmission>,
): Promise<BountySubmission> {
    try {
        if (!submissionId) {
            throw new Error('Submission ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);
        const bountyRepo = AppDataSource.getRepository(Bounty);

        // Find the submission by ID
        const submission = await submissionRepo.findOneBy({ id: submissionId });

        if (!submission) {
            throw new Error(`Submission with ID ${submissionId} not found`);
        }

        const bounty = await bountyRepo.findOneBy({ id: submission.bountyId });


        if (!bounty) {
            throw new Error(`Bounty with ID ${submissionId} not found`);
        }

        // Check if the bounty is closed or draft
        if (bounty.status === 'open' || bounty.status === 'draft') {
            throw new Error(`You can not update submission befor bouty is closed.`);
        }

        if (updates.status === 'approved' || updates.status === 'rejected' || updates.status === 'under_review') {
            updates.reviewedAt = new Date();
        }

        Object.assign(submission, updates);

        const updatedSubmission = await submissionRepo.save(submission);

        if ((updatedSubmission.status === 'approved' || updatedSubmission.status === 'rejected' || updatedSubmission.status === 'under_review')) {

            const isAllApprovuedORregected = await fetchBountyVerifySubmissionsForAdmin(bounty.id)

            if (isAllApprovuedORregected.areAllSubmissionsApprovedOrRejectedOrWinner) {
                bounty.status = 'qualified';
            } else {
                bounty.status = 'not_qualified';
            }
            await bountyRepo.save(bounty);
        }

        return updatedSubmission;
    } catch (error) {
        console.error(`Error editing submission with ID ${submissionId}:`, error);
        throw new Error(
            `Failed to edit submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}



// fn to fetch all submissions for a bounty
export async function fetchBountyQulifiedSubmissionsForAdmin(
    bountyId: string,
    page: number,
    limit: number,
    status: string[],
    searchTerm?: string,
): Promise<{
    submissions: BountySubmission[];
    bounty: Bounty;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const offset = (page - 1) * limit;

        const BountyRepo = AppDataSource.getRepository(Bounty);
        const bounty = await BountyRepo.findOneBy({ id: bountyId });
        if (!bounty) {
            throw new Error(`Bounty with ID ${bountyId} not found`);
        }
        const submissionRepo = AppDataSource.getRepository(BountySubmission);



        const qb = submissionRepo
            .createQueryBuilder('submission')
            .leftJoinAndSelect('submission.user', 'user')
            .leftJoinAndSelect('submission.bounty', 'bounty')
            .where('submission.bountyId = :bountyId', { bountyId });

        if (status && Array.isArray(status) && status.length > 0) {
            qb.andWhere('submission.status IN (:...status)', { status });
        } else {
            qb.andWhere('submission.status = :status', { status: 'approved' });
        }
        if (searchTerm) {
            qb.andWhere(
                '(user.fullname ILIKE :searchTerm OR user.first_name ILIKE :searchTerm OR user.last_name ILIKE :searchTerm)',
                { searchTerm: `%${searchTerm}%` },
            );
        }

        const [submissions, total] = await qb.skip(offset).take(limit).getManyAndCount();

        return {
            submissions,
            bounty,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(
            `Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}



export async function editClientQuelifiedBountySubmission(
    submissionId: string,
    updates: Partial<BountySubmission>,
): Promise<BountySubmission> {
    try {
        if (!submissionId) {
            throw new Error('Submission ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);
        const bountyRepo = AppDataSource.getRepository(Bounty);

        // Find the submission by ID
        const submission = await submissionRepo.findOneBy({ id: submissionId });

        if (!submission) {
            throw new Error(`Submission with ID ${submissionId} not found`);
        }

        const bounty = await bountyRepo.findOneBy({ id: submission.bountyId });


        if (!bounty) {
            throw new Error(`Bounty with ID ${submissionId} not found`);
        }

        // Check if the bounty is closed or draft
        if (bounty.status === 'open' || bounty.status === 'draft' || bounty.status === 'not_qualified') {
            throw new Error(`You can not declear wiiner befor bouty is closed or qualified all submisiion.`);
        }

        Object.assign(submission, updates);

        const updatedSubmission = await submissionRepo.save(submission);

        if ((updatedSubmission.status === 'reword_distributed' || updatedSubmission.status === 'reword_not_distributed')) {

            const submissionQulifiedOrNot = await fetchBountyQualifiedSubmissionsForAdmin(bounty.id)

            if ((submissionQulifiedOrNot.reword_not_distributed ||
                submissionQulifiedOrNot.reword_distributed)) {
                bounty.status = 'reward_not_distributed';
            }
            if (submissionQulifiedOrNot.isallrewordDecared) {
                bounty.status = 'reward_distributed';
            }
            await bountyRepo.save(bounty);
        }

        return updatedSubmission;
    } catch (error) {
        console.error(`Error editing submission with ID ${submissionId}:`, error);
        throw new Error(
            `Failed to edit submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}




import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export class BountySubmissionService {
    static async exportSubmissionsAsExcel(bountyId: string, res: Response) {
        const repo = AppDataSource.getRepository(BountySubmission);

        const submissions = await repo.find({
            where: { bountyId },
            relations: ['user'],
            order: { submittedAt: 'ASC' },
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bounty Submissions');

        sheet.columns = [
            { header: 'User ID', key: 'userId', width: 36 },
            { header: 'User Email', key: 'userEmail', width: 30 },
            { header: 'Submission Link', key: 'submissionLink', width: 50 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Ranking', key: 'ranking', width: 10 },
            { header: 'Submitted At', key: 'submittedAt', width: 25 },
            { header: 'Reviewed At', key: 'reviewedAt', width: 25 },
            { header: 'Feedback (JSON)', key: 'feedback', width: 50 },
        ];

        submissions.forEach((sub) => {
            sheet.addRow({
                userId: sub.userId,
                userEmail: sub.user?.email ?? 'N/A',
                submissionLink: sub.submissionLink,
                status: sub.status,
                ranking: sub.ranking ?? 'N/A',
                submittedAt: sub.submittedAt,
                reviewedAt: sub.reviewedAt ?? 'N/A',
                feedback: sub.feedback ? JSON.stringify(sub.feedback) : 'N/A',
            });
        });

        // Set the headers for file download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=bounty_${bountyId}_submissions.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
    }
}
