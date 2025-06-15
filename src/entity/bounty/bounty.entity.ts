import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { BountyStatus } from '../../services/v1/bounty';

/**
 * Bounty entity representing bounty challenges in the system
 */
@Entity('bounties')
export class Bounty {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 50 })
    @Index()
    bountyType!: string;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    bountyName!: string;

    @Column({ type: 'integer', default: 0 })
    submissions!: number;

    @Column({ type: 'integer', default: 20 })
    yaps!: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, any>;

    @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
    prize!: number;

    // add status column
    @Column({
        type: 'enum',
        enum: [
            'open',
            'closed',
            'draft',
            'not_qualified',
            'qualified',
            'not_winning',
            'winning',
            'reward',
            'not_reward',
        ],
        default: 'open',
    })
    @Index()
    status!: BountyStatus;

    @Column({ type: 'timestamp with time zone' })
    @Index()
    startDate!: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    endDate!: Date;

    // add creatorId column
    @Column({ type: 'uuid', nullable: true })
    creatorId!: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    /**
     * Check if bounty is currently active
     */
    isActive(): boolean {
        return (
            this.status === 'open' &&
            this.startDate <= new Date() &&
            (!this.endDate || this.endDate >= new Date())
        );
    }

    shouldBeClosed(): boolean {
        return this.status === 'open' && this.endDate !== null && this.endDate < new Date();
    }
    /**
     * Calculate remaining time in days
     */
    getRemainingDays(): number | null {
        if (!this.endDate) return null;

        const now = new Date();
        if (now > this.endDate) return 0;

        const diffTime = Math.abs(this.endDate.getTime() - now.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}
