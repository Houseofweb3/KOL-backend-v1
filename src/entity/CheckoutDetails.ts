import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { UserCheckoutInfluencer } from "./UserCheckoutInfluencer";
import { UserCheckoutPackages } from "./UserCheckoutPackages";

@Entity()
export class CheckoutDetails {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    projectName!: string;

    @Column()
    projectURL!: string;

    @Column()
    firstName!: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column()
    email!: string;

    @Column()
    influencers!: string;

    @Column({ nullable: true })
    link?: string;

    @Column()
    status!: string;

    @Column("float")
    totalPrice!: number;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.checkoutDetails)
    user!: User;

    @OneToMany(() => UserCheckoutInfluencer, userCheckoutInfluencer => userCheckoutInfluencer.checkoutDetails)
    userCheckoutInfluencers!: UserCheckoutInfluencer[];

    @OneToMany(() => UserCheckoutPackages, userCheckoutPackages => userCheckoutPackages.checkoutDetails)
    userCheckoutPackages!: UserCheckoutPackages[];
}
