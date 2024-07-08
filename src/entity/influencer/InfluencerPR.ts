import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class InfluencerPR {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
