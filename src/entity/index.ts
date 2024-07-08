// src/entity/index.ts
export * from "./user";

// TODO: This is redundant code delete it once all models are done.
//   @OneToMany(() => Question, question => question.admin)
// questions!: Question[];
//   @Column({ default: 'active' })
// status!: string;

// import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { InfluencerCart } from './InfluencerCart';
// import { PackageCart } from './PackageCart';
// import { CheckoutDetails } from './CheckoutDetails';
// import { UserCheckoutInfluencer } from './UserCheckoutInfluencer';
// import { UserCheckoutPackages } from './UserCheckoutPackages';

// @Entity()
// export class User {
//   @PrimaryColumn()
//   id!: string;

//   @Column({ unique: true })
//   email!: string;

//   @Column({ nullable: true })
//   password?: string;

//   @Column({ nullable: true })
//   fullname?: string;

//   @Column({ default: 'active' })
//   status!: string;

//   @CreateDateColumn()
//   createdAt!: Date;

//   @UpdateDateColumn()
//   updatedAt!: Date;

//   @OneToMany(() => InfluencerCart, influencerCart => influencerCart.user)
//   influencerCarts!: InfluencerCart[];

//   @OneToMany(() => PackageCart, packageCart => packageCart.user)
//   packageCarts!: PackageCart[];

//   @OneToMany(() => CheckoutDetails, checkoutDetails => checkoutDetails.user)
//   checkoutDetails!: CheckoutDetails[];

//   @OneToMany(() => UserCheckoutInfluencer, userCheckoutInfluencer => userCheckoutInfluencer.user)
//   userCheckoutInfluencers!: UserCheckoutInfluencer[];

//   @OneToMany(() => UserCheckoutPackages, userCheckoutPackages => userCheckoutPackages.user)
//   userCheckoutPackages!: UserCheckoutPackages[];
// }
