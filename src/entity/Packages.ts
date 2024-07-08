import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { PackageHeader } from "./PackageHeader";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class Packages extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    media!: string;

    @Column()
    link!: string;

    @Column()
    format!: string;

    @Column()
    monthlyTraffic!: string;

    @Column()
    turnaroundTime!: string;

    @Column()
    packageHeaderId!: string;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packages)
    packageHeader!: PackageHeader;
}
