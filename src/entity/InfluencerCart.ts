import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { InfluencerPR } from "./InfluencerPR";

@Entity()
export class InfluencerCart {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    influencerPRId!: string;

    @Column()
    userId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => User, user => user.influencerCarts)
    user!: User;

    @ManyToOne(() => InfluencerPR, influencerPR => influencerPR.influencerCarts)
    influencerPR!: InfluencerPR;
}
