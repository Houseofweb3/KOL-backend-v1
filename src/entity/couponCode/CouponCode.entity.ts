import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { UserCoupon } from './userCoupon.entity';

@Entity()
export class CouponCode extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    name!: string;

    @Column({ type: 'bigint' })
    expiryTimeStamp!: number;

    @Column({ type: 'decimal' })
    discountPercentage!: number;

    @Column({ type: 'int' })
    minimumOrderValue!: number;

    @Column({ type: 'boolean' })
    active!: boolean;

    @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.couponCode)
    userCoupons!: UserCoupon[];
}
