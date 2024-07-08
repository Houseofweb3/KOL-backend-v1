import "reflect-metadata";
import { 
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn
} from "typeorm";

import { PackageHeader } from "./PackageHeader";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class PackageCart extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packageCarts, { eager: true })
    packageHeader!: PackageHeader;
}
