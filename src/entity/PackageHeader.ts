import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Packages } from "./Packages";
import { PackageCart } from "./PackageCart";

@Entity()
export class PackageHeader {

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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @OneToMany(() => Packages, packages => packages.packageHeader)
    packages!: Packages[];

    @OneToMany(() => PackageCart, packageCart => packageCart.packageHeader)
    packageCarts!: PackageCart[];
}
