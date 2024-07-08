import "reflect-metadata";
import { 
    Entity,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    PrimaryGeneratedColumn, 
} from "typeorm";

import { InfluencerCart } from "./InfluencerCart";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class InfluencerPR extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    niche!: string;

    @Column()
    name!: string;

    @Column()
    category_name!: string;

    @Column()
    subscribers!: number;

    @Column()
    geography!: string;

    @Column()
    platform!: string;

    @Column("float")
    price!: number;

    @Column()
    credibilty_score!: string;

    @Column()
    engagement_rate!: string;

    @Column()
    engagement_type!: string;

    @Column()
    collab_velocity!: string;

    @Column()
    content_type!: string;

    @Column()
    motive!: string;

    @Column()
    description!: string;

    @Column()
    packages!: string;

    @Column()
    investor_type!: string;

    @Column()
    link!: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @OneToMany(() => InfluencerCart, influencerCart => influencerCart.influencerPR)
    influencerCarts!: InfluencerCart[];
}
