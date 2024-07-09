import {
    Entity,
    Column,
    PrimaryColumn,
    OneToMany
} from 'typeorm';

import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { UserOnboardingSelection } from '../onboarding/UserOnboardingSelection.entity';

export enum UserType {
    USER = 'user',
    ADMIN = 'admin',
}

@Entity()
export class User extends BaseModel {
    @PrimaryColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password?: string;

    @Column({ nullable: true })
    fullname?: string;

    // TODO: Add type of user ()
    @Column({ default: true })
    status!: boolean;

    @Column({
        type: 'enum',
        enum: UserType,
        default: UserType.USER
    })
    userType!: UserType;

    @OneToMany(() => UserOnboardingSelection, userSelection => userSelection.user)
    userSelections!: UserOnboardingSelection[];

    @OneToMany(() => Cart, cart => cart.user)
    carts!: Cart[];
}

