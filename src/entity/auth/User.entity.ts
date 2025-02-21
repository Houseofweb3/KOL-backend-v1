import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { UserCoupon } from '../couponCode/userCoupon.entity';
import { UserOnboardingSelection } from '../onboarding/UserOnboardingSelection.entity';

export enum UserType {
    USER = 'user',
    ADMIN = 'admin',
}

@Entity()
export class User extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password?: string;

    @Column({ nullable: true })
    fullname?: string;

    @Column({ nullable: true, name: 'project_name' })
    projectName?: string;

    //add colm for telegram id
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'telegram_id' })
    telegramId?: string;

    //add colm for project url
    @Column({ nullable: true, name: 'project_url' })
    projectUrl?: string;

    @Column({ default: false })
    is_deleted!: boolean;

    @Column({
        type: 'enum',
        enum: UserType,
        default: UserType.USER,
    })
    userType!: UserType;

    @OneToMany(() => UserOnboardingSelection, (userSelection) => userSelection.user)
    userSelections!: UserOnboardingSelection[];

    @OneToMany(() => Cart, (cart) => cart.user)
    carts!: Cart[];

    @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.user)
    userCoupons!: UserCoupon[];
}
