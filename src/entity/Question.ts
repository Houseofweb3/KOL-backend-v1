import {
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn
} from "typeorm";

import { Option } from "./Option";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class Question extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    question!: string;

    @OneToMany(() => Option, option => option.question)
    options!: Option[];
}
