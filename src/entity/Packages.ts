import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { PackageHeader } from "./PackageHeader";

@Entity()
export class Packages {

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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packages)
    packageHeader!: PackageHeader;
}
