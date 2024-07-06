import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Question } from "./Question";

@Entity()
export class Option {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

    @Column()
    question_id!: string;

    @Column()
    text!: string;

    @Column({ nullable: true })
    reference?: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Question, question => question.options)
    question!: Question;
}
