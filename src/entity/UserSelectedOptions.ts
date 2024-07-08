import {
    Entity,
    Column,
    PrimaryGeneratedColumn
} from "typeorm";

import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserSelectedOptions extends TimestampedEntity{

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    question_id!: string;

    @Column()
    selected_option_id!: string;
}
