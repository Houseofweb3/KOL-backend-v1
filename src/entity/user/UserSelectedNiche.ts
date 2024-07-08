import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class UserSelectedNiche {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("simple-array")
    niche_name!: string[];

    @Column()
    user_id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
