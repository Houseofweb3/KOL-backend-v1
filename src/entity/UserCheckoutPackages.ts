import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { CheckoutDetails } from "./CheckoutDetails";

@Entity()
export class UserCheckoutPackages {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    packages_id!: string;

    @Column()
    user_id!: string;

    @Column()
    order_id!: string;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.userCheckoutPackages)
    user!: User;

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutPackages)
    checkoutDetails!: CheckoutDetails;
}
