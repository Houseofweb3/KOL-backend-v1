import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PackageCart } from './PackageCart.entity';
import { PackageItem } from '../package/PackageItem.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class PackageCartItem extends TimestampedEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => PackageCart, (cart) => cart.items)
    @JoinColumn({ name: 'package_cart_id' })
    packageCart!: PackageCart;

    @ManyToOne(() => PackageItem, (item) => item.packageCartItems)
    @JoinColumn({ name: 'package_item_id' })
    packageItem!: PackageItem;

    @Column()
    quantity!: number;
}