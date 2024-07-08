import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { InfluencerCart } from '../cart/InfluencerCart.entity';
import { PackageCart } from '../cart/PackageCart.entity';
import { CheckoutDetails } from '../checkout/CheckoutDetails.entity';
import { UserCheckoutInfluencer } from '../checkout/UserCheckoutInfluencer.entity';
import { UserCheckoutPackages } from '../checkout/UserCheckoutPackages.entity';
import { UserSelections } from '../selectedInfluncer/UserSelections.entity';
import { UserReferencePriority } from '../selectedInfluncer/UserReferencePriority.entity';
import { UserSelectedNiche } from '../selectedInfluncer/UserSelectedNiche.entity';

@Entity()
export class User {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: false })
  password?: string;

  @Column({ nullable: true })
  fullname?: string;

  @Column({ default: 'active' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => InfluencerCart, influencerCart => influencerCart.user)
  influencerCarts!: InfluencerCart[];

  @OneToMany(() => PackageCart, packageCart => packageCart.user)
  packageCarts!: PackageCart[];

  @OneToMany(() => CheckoutDetails, checkoutDetails => checkoutDetails.user)
  checkoutDetails!: CheckoutDetails[];

  @OneToMany(() => UserCheckoutInfluencer, userCheckoutInfluencer => userCheckoutInfluencer.user)
  userCheckoutInfluencers!: UserCheckoutInfluencer[];

  @OneToMany(() => UserCheckoutPackages, userCheckoutPackages => userCheckoutPackages.user)
  userCheckoutPackages!: UserCheckoutPackages[];

  @OneToMany(() => UserSelections, userSelections => userSelections.user)
  userSelections!: UserSelections[];

  @OneToMany(() => UserReferencePriority, userReferencePriority => userReferencePriority.user)
  userReferencePriorities!: UserReferencePriority[];

  @OneToMany(() => UserSelectedNiche, userSelectedNiche => userSelectedNiche.user)
  selectedNiches!: UserSelectedNiche[];
}
