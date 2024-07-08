import {
    Entity,
    Column,
    PrimaryGeneratedColumn
} from "typeorm";

import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserSelectedNiche extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("simple-array")
    niche_name!: string[];

    @Column()
    user_id!: string;
}
