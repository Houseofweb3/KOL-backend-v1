import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PackageCart } from './PackageCart';
import { PackageItem } from './PackageItem';


@Entity()
export class PackageCartItem {
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