import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Admin } from "./Admin";
import { Option } from "./Option";

@Entity()
export class Question {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

    @Column()
    text!: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => Option, option => option.question)
    options!: Option[];

    @ManyToOne(() => Admin, admin => admin.questions)
    admin!: Admin;
}
