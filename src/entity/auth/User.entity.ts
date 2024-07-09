import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { UserOnboardingSelection } from '../onboarding/UserOnboardingSelection.entity';
import { InfluencerCart } from '../cart/InfluencerCart.entity';
import { PackageCart } from '../cart/PackageCart.entity';

@Entity()
export class User extends BaseModel {
  @PrimaryColumn("")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: false })
  password?: string;

  @Column({ nullable: true })
  fullname?: string;

  // TODO: Add type of user (Completed)
  @Column({ default: true })
  status!: boolean;

  // Vaibhav established FK connections
  @OneToMany(() => UserOnboardingSelection, userSelection => userSelection.user)
  userSelections!: UserOnboardingSelection[];

  @OneToMany(() => InfluencerCart, influencerCarts => influencerCarts.user)
  influencerCarts!: InfluencerCart[];

  @OneToMany(() => PackageCart, packageCarts => packageCarts.user)
  packageCarts!: PackageCart[];
}

