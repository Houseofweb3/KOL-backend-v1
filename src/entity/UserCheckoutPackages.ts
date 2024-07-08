import {
    Entity,
    Column,
    ManyToOne,
    CreateDateColumn,
    PrimaryGeneratedColumn
} from "typeorm";

import { CheckoutDetails } from "./CheckoutDetails";
import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserCheckoutPackages extends TimestampedEntity{

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

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutPackages)
    checkoutDetails!: CheckoutDetails;
}
