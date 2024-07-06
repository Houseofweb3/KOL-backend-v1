import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { PackageHeader } from "./PackageHeader";

@Entity()
export class PackageCart {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packageCarts, { eager: true })
    packageHeader!: PackageHeader;

    @ManyToOne(() => User, user => user.packageCarts, { eager: true })
    user!: User;
}
