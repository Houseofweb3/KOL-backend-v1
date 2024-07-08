import {
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn
} from "typeorm";

import { Packages } from "./Packages";
import { PackageCart } from "./PackageCart";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class PackageHeader extends TimestampedEntity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    header!: string;

    @Column()
    cost!: string;

    @Column({ nullable: true })
    text1?: string;

    @Column({ nullable: true })
    text2?: string;

    @Column({ nullable: true })
    text3?: string;

    @Column({ nullable: true })
    text4?: string;

    @Column({ nullable: true })
    text5?: string;

    @Column({ nullable: true })
    text6?: string;

    @Column({ nullable: true })
    text7?: string;

    @OneToMany(() => Packages, packages => packages.packageHeader)
    packages!: Packages[];

    @OneToMany(() => PackageCart, packageCart => packageCart.packageHeader)
    packageCarts!: PackageCart[];
}
