import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";

// Admin Entity
@Entity()
export class Admin {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ nullable: true })
    password?: string;

    @Column({ nullable: true })
    fullname?: string;

    @Column({ default: "active" })
    status!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => Question, question => question.admin)
    questions!: Question[];
}

// Question Entity
@Entity()
export class Question {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

    @Column()
    text!: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => Option, option => option.question)
    options!: Option[];

    @ManyToOne(() => Admin, admin => admin.questions)
    admin!: Admin;
}

// Option Entity
@Entity()
export class Option {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

    @Column()
    question_id!: string;

    @Column()
    text!: string;

    @Column({ nullable: true })
    reference?: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Question, question => question.options)
    question!: Question;
}

// User Entity
@Entity()
export class User {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ nullable: true })
    password?: string;

    @Column({ nullable: true })
    fullname?: string;

    @Column({ default: "active" })
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
}

// InfluencerPR Entity
@Entity()
export class InfluencerPR {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_id!: string;

    @Column()
    niche!: string;

    @Column()
    name!: string;

    @Column()
    category_name!: string;

    @Column()
    subscribers!: number;

    @Column()
    geography!: string;

    @Column()
    platform!: string;

    @Column("float")
    price!: number;

    @Column()
    credibilty_score!: string;

    @Column()
    engagement_rate!: string;

    @Column()
    engagement_type!: string;

    @Column()
    collab_velocity!: string;

    @Column()
    content_type!: string;

    @Column()
    motive!: string;

    @Column()
    description!: string;

    @Column()
    packages!: string;

    @Column()
    investor_type!: string;

    @Column()
    link!: string;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => InfluencerCart, influencerCart => influencerCart.influencerPR)
    influencerCarts!: InfluencerCart[];
}

// UserSelectedNiche Entity
@Entity()
export class UserSelectedNiche {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("simple-array")
    niche_name!: string[];

    @Column()
    user_id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

// UserSelectedOptions Entity
@Entity()
export class UserSelectedOptions {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    question_id!: string;

    @Column()
    selected_option_id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

// UserReferencePriority Entity
@Entity()
export class UserReferencePriority {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    reference_name!: string;

    @Column("int")
    reference_count!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

// PackageHeader Entity
@Entity()
export class PackageHeader {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    header!: string;

    @Column()
    cost!: string;

    @Column({ nullable: true })
    text1?: string;

    @Column({ nullable: true })
    text2?: string;

    @Column({ nullable: true })
    text3?: string;

    @Column({ nullable: true })
    text4?: string;

    @Column({ nullable: true })
    text5?: string;

    @Column({ nullable: true })
    text6?: string;

    @Column({ nullable: true })
    text7?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @OneToMany(() => Packages, packages => packages.packageHeader)
    packages!: Packages[];

    @OneToMany(() => PackageCart, packageCart => packageCart.packageHeader)
    packageCarts!: PackageCart[];
}

// Packages Entity
@Entity()
export class Packages {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    media!: string;

    @Column()
    link!: string;

    @Column()
    format!: string;

    @Column()
    monthlyTraffic!: string;

    @Column()
    turnaroundTime!: string;

    @Column()
    packageHeaderId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true })
    createdBy?: string;

    @Column({ nullable: true })
    updatedBy?: string;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packages)
    packageHeader!: PackageHeader;
}

// InfluencerCart Entity
@Entity()
export class InfluencerCart {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    influencerPRId!: string;

    @Column()
    userId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => User, user => user.influencerCarts)
    user!: User;

    @ManyToOne(() => InfluencerPR, influencerPR => influencerPR.influencerCarts)
    influencerPR!: InfluencerPR;
}

// PackageCart Entity
@Entity()
export class PackageCart {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    package_header_id!: string;

    @Column()
    user_id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => PackageHeader, packageHeader => packageHeader.packageCarts)
    packageHeader!: PackageHeader;

    @ManyToOne(() => User, user => user.packageCarts)
    user!: User;
}

// CheckoutDetails Entity
@Entity()
export class CheckoutDetails {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    user_id!: string;

    @Column()
    projectName!: string;

    @Column()
    projectURL!: string;

    @Column()
    firstName!: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column()
    email!: string;

    @Column()
    influencers!: string;

    @Column({ nullable: true })
    link?: string;

    @Column()
    status!: string;

    @Column("float")
    totalPrice!: number;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.checkoutDetails)
    user!: User;

    @OneToMany(() => UserCheckoutInfluencer, userCheckoutInfluencer => userCheckoutInfluencer.checkoutDetails)
    userCheckoutInfluencers!: UserCheckoutInfluencer[];

    @OneToMany(() => UserCheckoutPackages, userCheckoutPackages => userCheckoutPackages.checkoutDetails)
    userCheckoutPackages!: UserCheckoutPackages[];
}

// UserCheckoutInfluencer Entity
@Entity()
export class UserCheckoutInfluencer {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    influencers_id!: string;

    @Column()
    user_id!: string;

    @Column()
    order_id!: string;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.userCheckoutInfluencers)
    user!: User;

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutInfluencers)
    checkoutDetails!: CheckoutDetails;
}

// UserCheckoutPackages Entity
@Entity()
export class UserCheckoutPackages {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    packages_id!: string;

    @Column()
    user_id!: string;

    @Column()
    order_id!: string;

    @CreateDateColumn()
    createdDateTime!: Date;

    @ManyToOne(() => User, user => user.userCheckoutPackages)
    user!: User;

    @ManyToOne(() => CheckoutDetails, checkoutDetails => checkoutDetails.userCheckoutPackages)
    checkoutDetails!: CheckoutDetails;
}
