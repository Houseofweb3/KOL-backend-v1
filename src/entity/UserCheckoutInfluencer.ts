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
export class UserCheckoutInfluencer extends TimestampedEntity {

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

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutInfluencers)
    checkoutDetails!: CheckoutDetails;
}
