import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { InfluencerCart } from '../influencer/InfluencerCart';
import { PackageCart } from '../package/PackageCart';
import { CheckoutDetails } from '../checkout/CheckoutDetails';
import { UserCheckoutInfluencer } from '../checkout/UserCheckoutInfluencer';
import { UserCheckoutPackages } from '../checkout/UserCheckoutPackages';

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
  packageCart!: PackageCart[];  // Ensure the relation name matches in the PackageCart entity

  @OneToMany(() => CheckoutDetails, checkoutDetails => checkoutDetails.user)
  checkoutDetails!: CheckoutDetails[];

  @OneToMany(() => UserCheckoutInfluencer, userCheckoutInfluencer => userCheckoutInfluencer.user)
  userCheckoutInfluencers!: UserCheckoutInfluencer[];

  @OneToMany(() => UserCheckoutPackages, userCheckoutPackages => userCheckoutPackages.user)
  userCheckoutPackages!: UserCheckoutPackages[];
}
