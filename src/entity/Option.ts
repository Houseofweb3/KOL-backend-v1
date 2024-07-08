import "reflect-metadata";
import {
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn 
} from "typeorm";

import { Question } from "./Question";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class Option extends TimestampedEntity {

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

    @ManyToOne(() => Question, question => question.options)
    question!: Question;
}
