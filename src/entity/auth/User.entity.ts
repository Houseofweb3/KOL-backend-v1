import { Entity, Column, OneToMany, PrimaryGeneratedColumn, Index } from 'typeorm';
import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { UserCoupon } from '../couponCode/userCoupon.entity';
import { UserOnboardingSelection } from '../onboarding/UserOnboardingSelection.entity';
import { BountySubmission } from '../bounty/bountyRelation.entity';

export enum UserType {
    USER = 'user',
    ADMIN = 'admin',
}

export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    EXECUTIVE_ADMIN = 'executive_admin',
    KOL_ADMIN = 'kol_admin',
    USER = 'user',
}

@Entity()
export class User extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ unique: true })
    email!: string;

    @Column()
    password?: string;

    @Column({ nullable: true })
    fullname?: string;

    @Column({ nullable: true})
    profilePicture?: string;

    // Add first name column
    @Column({ nullable: true, name: 'first_name' })
    firstName?: string;

    // Add last name column
    @Column({ nullable: true, name: 'last_name' })
    lastName?: string;

    @Column({ nullable: true, name: 'project_name' })
    projectName?: string;

    // Add column for Telegram ID
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'telegram_id' })
    telegramId?: string;

    // Add column for Project URL
    @Column({ nullable: true, name: 'project_url' })
    projectUrl?: string;

    // Add column for Phone Number
    @Column({ nullable: true, name: 'phone_number', length: 20, unique: true })
    phoneNumber?: string;

    @Column({ default: false })
    is_deleted!: boolean;

    // User type: Regular user or admin
    @Column({
        type: 'enum',
        enum: UserType,
        default: UserType.USER,
    })
    userType!: UserType;

    // Admin role (null if regular user)
    @Column({
        type: 'enum',
        enum: UserRole,
        nullable: true,
        default: null,
    })
    role?: UserRole | null;

    // Add json field to store address info
    @Column({ type: 'json', nullable: true })
    addressInfo?: Record<string, string>;

    @OneToMany(() => UserOnboardingSelection, (userSelection) => userSelection.user)
    userSelections!: UserOnboardingSelection[];

    @OneToMany(() => Cart, (cart) => cart.user)
    carts!: Cart[];

    @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.user)
    userCoupons!: UserCoupon[];

    @OneToMany(() => BountySubmission, (submission) => submission.user)
    bountySubmissions!: BountySubmission[];
}
