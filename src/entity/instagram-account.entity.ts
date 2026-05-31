import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Influencer } from './influencer.entity';

/** One follower-demographics breakdown row (country | city | age | gender). */
export interface InstagramDemographicEntry {
    key: string;
    value: number;
}

export interface InstagramDemographics {
    topCountries?: InstagramDemographicEntry[];
    topCities?: InstagramDemographicEntry[];
    age?: InstagramDemographicEntry[];
    gender?: InstagramDemographicEntry[];
}

/**
 * A connected Instagram account (via Instagram Login). Created during the OAuth
 * round-trip, which happens BEFORE the onboarding form is submitted, so it exists
 * independently and is keyed by the stable `igUserId`. Influencer rows created at
 * form-submit time link back to it via `instagram_account_id`.
 *
 * Re-connecting the same account upserts this row (no duplicates).
 */
@Entity('instagram_accounts')
export class InstagramAccount extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Instagram user id — the correlation key between OAuth and onboarding. */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, name: 'ig_user_id' })
    igUserId!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    username!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'account_type' })
    accountType!: string | null;

    @Column({ type: 'int', nullable: true, name: 'followers_count' })
    followersCount!: number | null;

    @Column({ type: 'int', nullable: true, name: 'media_count' })
    mediaCount!: number | null;

    /** Long-lived token, AES-256-GCM encrypted at rest (never stored in plaintext). */
    @Column({ type: 'text', name: 'encrypted_token' })
    encryptedToken!: string;

    @Column({ type: 'timestamp', nullable: true, name: 'token_expires_at' })
    tokenExpiresAt!: Date | null;

    /** Snapshot of follower demographics at connect time. */
    @Column({ type: 'jsonb', nullable: true })
    demographics!: InstagramDemographics | null;

    @OneToMany(() => Influencer, (influencer) => influencer.instagramAccount)
    influencers!: Influencer[];

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
