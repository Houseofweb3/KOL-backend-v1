import { Entity, Column, OneToMany, PrimaryGeneratedColumn, Index } from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { InfluencerCartItem } from '../cart';

@Entity()
export class Influencer extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    niche!: string;

    @Column({ nullable: true })
    niche2!: string;

    @Column()
    @Index() // Add an index to speed up search queries
    name!: string;

    @Column({ nullable: true })
    @Index() // Add an index for sorting and filtering
    categoryName!: string;

    @Column({ nullable: true, type: "numeric" })
    @Index() // Add an index for sorting
    subscribers!: number;

    @Column({ nullable: true })
    geography!: string;

    @Column()
    platform!: string;

    @Column('decimal')
    @Index() // Add an index for sorting
    price!: number;
    
    @Column({ type: 'numeric', nullable: true, default: 1 })
    @Index() // Add an index for sorting
    quantity!: number;

    @Column({ type: 'numeric', nullable: true, default: 0 })
    tweetScoutScore!: number;

    @Column()
    credibilityScore!: string;

    @Column({ nullable: true })
    engagementRate!: string;

    @Column({ nullable: true })
    investorType!: string;

    @Column({ nullable: true })
    blockchain!: string;

    @Column({ nullable: true })
    dpLink!: string;

    @Column({ nullable: true })
    socialMediaLink!: string;

    @Column({ nullable: true })
    contentType!: string;

    @Column({ nullable: true })
    deleted!: boolean;

    @OneToMany(() => InfluencerCartItem, (item) => item.influencer)
    influencerCartItems!: InfluencerCartItem[];
}
