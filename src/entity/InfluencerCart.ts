import "reflect-metadata";
import { 
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn 
} from "typeorm";

import { User } from "./index";
import { InfluencerPR } from "./InfluencerPR";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class InfluencerCart extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    influencerPRId!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => InfluencerPR, influencerPR => influencerPR.influencerCarts)
    influencerPR!: InfluencerPR;
}
