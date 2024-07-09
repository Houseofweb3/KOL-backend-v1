import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Admin } from '../auth/Admin.entity';
import { InfluencerCartItem } from '../cart/InfluencerCartItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerPR extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Admin, admin => admin.influencerPRs)
    admin: Admin | undefined;

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

    @Column('jsonb', { nullable: true })
    additionalDetails!: Record<string, any>;

    @Column()
    createdBy!: string;

    @Column()
    updatedBy!: string;

    @OneToMany(() => InfluencerCartItem, item => item.influencer)
    influencerCartItems!: InfluencerCartItem[];
}
