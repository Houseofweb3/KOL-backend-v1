import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { PackageItem } from '../package/PackageItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class PackageCartItem extends BaseModel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => PackageItem, (item) => item.packageCartItems)
    @JoinColumn({ name: 'package_item_id' })
    packageItem!: PackageItem;

    @ManyToOne(() => Cart, (cart) => cart.packageCartItems)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}