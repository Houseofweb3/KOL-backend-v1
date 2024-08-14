import {
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn,
    Index,
} from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { InfluencerCartItem } from '../cart';

@Entity()
export class Influencer extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    niche!: string;

    @Column()
    @Index()  // Add an index to speed up search queries
    name!: string;

    @Column()
    @Index()  // Add an index for sorting and filtering
    categoryName!: string;

    @Column('int')
    @Index()  // Add an index for sorting
    subscribers!: number;

    @Column()
    geography!: string;

    @Column()
    platform!: string;

    @Column('decimal')
    @Index()  // Add an index for sorting
    price!: number;

    @Column()
    credibilityScore!: string;

    @Column()
    engagementRate!: string;

    @Column()
    investorType!: string;

    @Column({ nullable: true })
    blockchain!: string;

    @Column()
    dpLink!: string;

    @OneToMany(() => InfluencerCartItem, (item) => item.influencer)
    influencerCartItems!: InfluencerCartItem[];
}

