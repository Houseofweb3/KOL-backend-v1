import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from '../auth/User.entity';
import { CouponCode } from './CouponCode.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserCoupon extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'boolean', default: false })
    isUsed!: boolean;

    @Column({ type: 'boolean', default: false })
    hasAvail!: boolean;

    @ManyToOne(() => User, (user) => user.userCoupons)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @ManyToOne(() => CouponCode, (couponCode) => couponCode.userCoupons)
    @JoinColumn({ name: 'couponCodeId' })
    couponCode!: CouponCode;
}
