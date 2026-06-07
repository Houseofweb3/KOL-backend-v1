import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Influencer } from './influencer.entity';

/** One audience breakdown row (country | age | gender). value is a view count (country) or viewer % (age/gender). */
export interface YoutubeDemographicEntry {
  key: string;
  value: number;
}

export interface YoutubeDemographics {
  topCountries?: YoutubeDemographicEntry[];
  age?: YoutubeDemographicEntry[];
  gender?: YoutubeDemographicEntry[];
}

/**
 * A connected YouTube channel (via Google OAuth). Created during the OAuth round-trip,
 * which happens BEFORE the onboarding form is submitted, so it exists independently and
 * is keyed by the stable `channelId`. Influencer rows created at form-submit time link
 * back to it via `youtube_account_id`.
 *
 * Re-connecting the same channel upserts this row (no duplicates). Unlike Instagram's
 * 60-day token, Google issues 1-hour access tokens plus a long-lived refresh token; we
 * store the encrypted refresh token and mint fresh access tokens on demand.
 */
@Entity('youtube_accounts')
export class YoutubeAccount extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** YouTube channel id (UC...) — the correlation key between OAuth and onboarding. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, name: 'channel_id' })
  channelId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  /** Channel handle / vanity URL (e.g. @ampli5). */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'custom_url' })
  customUrl!: string | null;

  @Column({ type: 'int', nullable: true, name: 'subscriber_count' })
  subscriberCount!: number | null;

  @Column({ type: 'int', nullable: true, name: 'video_count' })
  videoCount!: number | null;

  /** Lifetime channel view count (can exceed 32-bit; stored as bigint → string at runtime). */
  @Column({ type: 'bigint', nullable: true, name: 'view_count' })
  viewCount!: string | null;

  /** Long-lived Google refresh token, AES-256-GCM encrypted at rest (never plaintext). */
  @Column({ type: 'text', name: 'encrypted_refresh_token' })
  encryptedRefreshToken!: string;

  /** Last short-lived access token, encrypted. Optional cache; refreshed from the refresh token. */
  @Column({ type: 'text', nullable: true, name: 'encrypted_access_token' })
  encryptedAccessToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'token_expires_at' })
  tokenExpiresAt!: Date | null;

  /** Snapshot of audience demographics at connect time. */
  @Column({ type: 'jsonb', nullable: true })
  demographics!: YoutubeDemographics | null;

  @OneToMany(() => Influencer, (influencer) => influencer.youtubeAccount)
  influencers!: Influencer[];

  @Column({ default: false, name: 'is_deleted' })
  isDeleted!: boolean;
}
