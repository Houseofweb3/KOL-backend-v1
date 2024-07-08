import { Entity, Column, PrimaryGeneratedColumn} from "typeorm";

import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserReferencePriority extends TimestampedEntity{

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    reference_name!: string;

    @Column("int")
    reference_count!: number;
}
