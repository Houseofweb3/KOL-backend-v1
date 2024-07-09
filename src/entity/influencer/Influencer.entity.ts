import {
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn
} from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { InfluencerCartItem } from '../cart/InfluencerCartItem.entity';

@Entity()
export class Influencer extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    niche!: string;

    @Column()
    name!: string;

    @Column()
    categoryName!: string;

    @Column('int')
    subscribers!: number;

    @Column()
    geography!: string;

    @Column()
    platform!: string;

    @Column('decimal')
    price!: number;

    @Column('decimal')
    engagementRate!: number;

    @Column()
    investorType!: string;

    @OneToMany(() => InfluencerCartItem, (item) => item.influencer)
    influencerCartItems!: InfluencerCartItem[];
}
