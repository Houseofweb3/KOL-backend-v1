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
    params: CreateBountySubmissionParams
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
        submission.status = 'pending';

        // Save the submission
        const savedSubmission = await submissionRepo.save(submission);

        // Update bounty submission count
        bounty.submissions += 1;
        await bountyRepo.save(bounty);

        return savedSubmission;
    } catch (error) {
        console.error('Error creating bounty submission:', error);
        throw new Error(`Failed to create bounty submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// fn to fetch all submissions for a bounty
export async function fetchBountySubmissions(bountyId: string): Promise<BountySubmission[]> {
    try {
        if (!bountyId) {
            throw new Error('Bounty ID is required');
        }

        const submissionRepo = AppDataSource.getRepository(BountySubmission);

        // Fetch all submissions for the given bounty ID
        const submissions = await submissionRepo.findBy({ bountyId });

        return submissions;
    } catch (error) {
        console.error(`Error fetching submissions for bounty ${bountyId}:`, error);
        throw new Error(`Failed to fetch submissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// editBountySubmission function to edit a submission, with link, sbmittedAt and reviewedAt

export async function editBountySubmission(
    submissionId: string,
    updates: Partial<BountySubmission>
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
        throw new Error(`Failed to edit submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Usage example:
 * 
 * try {
 *   const submission = await createBountySubmission({
 *     userId: '550e8400-e29b-41d4-a716-446655440000',
 *     bountyId: '550e8400-e29b-41d4-a716-446655440001',
 *     submissionLink: 'https://github.com/username/repo/pull/123'
 *   });
 *   
 *   console.log('Submission created:', submission.id);
 * } catch (error) {
 *   console.error('Failed to create submission:', error.message);
 * }
 */