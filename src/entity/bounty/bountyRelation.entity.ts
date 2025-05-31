import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { User } from '../auth/User.entity';
import { Bounty } from './bounty.entity';

/**
 * Entity representing user submissions to a bounty
 */
@Entity('bounty_submissions')
@Unique(['userId', 'bountyId']) // Ensures one user can only submit once per bounty
export class BountySubmission {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'uuid' })
    @Index()
    bountyId!: string;

    @Column({ type: 'varchar', length: 1000 })
    submissionLink!: string;

    @Column({
        type: 'enum',
        enum: ['under review', 'winner', 'approved', 'rejected', 'pending'],
        default: 'under review',
    })
    status!: 'under review' | 'winner' | 'approved' | 'rejected' | 'pending';

    @Column({ type: 'jsonb', nullable: true })
    feedback?: Record<string, any>;

    // add ranking column
    @Column({ type: 'integer', nullable: true })
    ranking?: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    submittedAt!: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    reviewedAt?: Date;

    // Relations - uncomment if you want to use TypeORM relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @ManyToOne(() => Bounty)
    @JoinColumn({ name: 'bountyId' })
    bounty!: Bounty;
}
