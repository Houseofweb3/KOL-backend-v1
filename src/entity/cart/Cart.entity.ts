import {
    Entity,
    OneToOne,
    OneToMany,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn
} from 'typeorm';

import { User } from '../auth';
import { Checkout } from '../checkout';
import { CheckoutPr } from '../checkoutPr';
import { PackageCartItem } from './PackageCartItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { InfluencerCartItem } from './InfluencerCartItem.entity';
import { DrCartItem } from './DrCartItem.entity';

@Entity()
export class Cart extends BaseModel {
    
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, user => user.carts, { nullable: true })
    user?: User;

    @OneToMany(() => InfluencerCartItem, (item) => item.cart, { cascade: true, onDelete: 'CASCADE' })
    influencerCartItems!: InfluencerCartItem[];

    @OneToMany(() => PackageCartItem, (item) => item.cart, { cascade: true, onDelete: 'CASCADE' })
    packageCartItems!: PackageCartItem[];

    @OneToMany(() => DrCartItem, (item) => item.cart, { cascade: true, onDelete: 'CASCADE' })
    drCartItems!: DrCartItem[];

    @OneToOne(() => Checkout, checkout => checkout.cart, { nullable: true })
    checkout?: Checkout;

    @OneToOne(() => CheckoutPr, checkoutPr => checkoutPr.cart, { nullable: true })
    checkoutPr?: CheckoutPr;
}
