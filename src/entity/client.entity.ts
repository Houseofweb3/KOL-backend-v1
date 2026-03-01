import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Cart } from './cart.entity';

/**
 * Client = the customer who purchases influencer services.
 * Can optionally link to User (userId) for auth.
 */
@Entity('clients')
export class Client extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 255 })
    name!: string;

    @Index({ unique: true })
    @Column({ length: 255 })
    email!: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    website!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'telegram_id' })
    telegramId!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'whatsapp_number' })
    whatsAppNumber!: string | null;

    /** e.g. Tech, Fashion – stored as JSON array or comma-separated */
    @Column({ type: 'text', nullable: true })
    categories!: string | null;

    @Column({ type: 'text', nullable: true, name: 'campaign_goals' })
    campaignGoals!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'monetization_model' })
    monetizationModel!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'primary_audience_geography' })
    primaryAudienceGeography!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'age_range' })
    ageRange!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'gender_skew' })
    genderSkew!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'campaign_start_timeline' })
    campaignStartTimeline!: string | null;

    @Column({ type: 'text', nullable: true, name: 'custom_brief' })
    customBrief!: string | null;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;

    @OneToMany(() => Cart, (cart) => cart.client)
    carts!: Cart[];
}
