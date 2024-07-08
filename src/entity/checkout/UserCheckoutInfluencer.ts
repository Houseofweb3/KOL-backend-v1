import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "../auth/User";
import { CheckoutDetails } from "./CheckoutDetails";

@Entity()
export class UserCheckoutInfluencer {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    influencers_id!: string;

    @Column()
    user_id!: string;

    @Column()
    order_id!: string;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.userCheckoutInfluencers)
    user!: User;

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutInfluencers)
    checkoutDetails!: CheckoutDetails;
}
