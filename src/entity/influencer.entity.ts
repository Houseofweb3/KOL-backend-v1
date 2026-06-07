import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { CartItem } from './cart-item.entity';
import { InstagramAccount } from './instagram-account.entity';
import { YoutubeAccount } from './youtube-account.entity';

/**
 * Influencer = the service being sold.
 * No separate "service" entity; cart/orders reference influencers.
 */
@Entity('influencers')
export class Influencer extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ length: 255 })
    name!: string;

    @Index()
    @Column({ length: 255 })
    email!: string;
   
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'telegram_id' })
    telegramId!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'whatsapp_number' })
    whatsAppNumber!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'primary_country' })
    primaryCountry!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'primary_timezone' })
    primaryTimezone!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    platform!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'platform_link' })
    platformLink!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 255, nullable: true })
    inventory!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    buyPrice!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    sellPrice!: string | null;
   
    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    cpm!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    ccp!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 50, nullable: true, name: 'avg_views' })
    avgViews!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 255, nullable: true })
    industries!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 255, nullable: true })
    categories!: string | null;

    /** Creator role from onboarding (“I am a …”). */
    @Column({ type: 'varchar', length: 500, nullable: true, name: 'creator_type' })
    creatorType!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'primary_audience_geography' })
    primaryAudienceGeography!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'secondary_audience_geography' })
    secondaryAudienceGeography!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'age_screenshot_url' })
    ageScreenshotUrl!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'gender_screenshot_url' })
    genderScreenshotUrl!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'top_countries_screenshot_url' })
    topCountriesScreenshotUrl!: string | null;

    @Column({ type: 'text', nullable: true, name: 'payment_terms' })
    paymentTerms!: string | null;

    @Column({ type: 'text', nullable: true, name: 'turnaround_times' })
    turnaroundTimes!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'first_collaboration_post_link_1' })
    firstCollaborationPostLink1!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'first_collaboration_post_link_2' })
    firstCollaborationPostLink2!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'first_collaboration_image_1' })
    firstCollaborationImage1!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'first_collaboration_image_2' })
    firstCollaborationImage2!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'first_collaboration_image_3' })
    firstCollaborationImage3!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'x_link' })
    xLink!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'instagram_link' })
    instagramLink!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'youtube_link' })
    youtubeLink!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'tiktok_link' })
    tiktokLink!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'newsletter_link' })
    newsletterLink!: string | null;

    @Column({ type: 'boolean' , default: false, name: 'final_confirmation' })
    finalConfirmation!: boolean;

    @OneToMany(() => CartItem, (item) => item.influencer)
    cartItems!: CartItem[];

    /** Connected Instagram account (linked at onboarding-submit time; set before the influencer existed). */
    @Index()
    @Column({ type: 'uuid', nullable: true, name: 'instagram_account_id' })
    instagramAccountId!: string | null;

    @ManyToOne(() => InstagramAccount, (account) => account.influencers, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'instagram_account_id' })
    instagramAccount!: InstagramAccount | null;

    /** Connected YouTube channel (linked at onboarding-submit time; set before the influencer existed). */
    @Index()
    @Column({ type: 'uuid', nullable: true, name: 'youtube_account_id' })
    youtubeAccountId!: string | null;

    @ManyToOne(() => YoutubeAccount, (account) => account.influencers, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'youtube_account_id' })
    youtubeAccount!: YoutubeAccount | null;

    @Column({ default: false, name: 'is_verified' })
    isVerified!: boolean;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
