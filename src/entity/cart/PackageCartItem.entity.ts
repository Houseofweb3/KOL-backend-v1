import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Cart } from './Cart.entity';
import { Package } from '../package/Package.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class PackageCartItem extends BaseModel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Package, (pkg) => pkg.packageCartItems)
    @JoinColumn({ name: 'package_id' })
    package!: Package;

    @ManyToOne(() => Cart, (cart) => cart.packageCartItems)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}
