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
import { PackageCartItem } from './packageCartItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { InfluencerCartItem } from './influencerCartItem.entity';

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

    @OneToOne(() => Checkout, checkout => checkout.cart, { nullable: true })
    @JoinColumn()
    checkout?: Checkout;
}
