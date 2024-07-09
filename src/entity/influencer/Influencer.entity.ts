import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

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

    // TODO: Discuss this with Mohit
    @Column('jsonb', { nullable: true })
    additionalDetails!: Record<string, any>;
}
