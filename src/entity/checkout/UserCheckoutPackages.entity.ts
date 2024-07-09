import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "../auth/User.entity";
import { CheckoutDetails } from "./CheckoutDetails.entity";

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserCheckoutPackages extends BaseModel {

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
