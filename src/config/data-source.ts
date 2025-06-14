import { DataSource } from 'typeorm';

import { ENV } from './env';
import { Cart } from '../entity/cart';
import { Package } from '../entity/package';
import { Checkout } from '../entity/checkout';
import { PackageItem } from '../entity/package';
import { PackageCartItem } from '../entity/cart';
import { Influencer } from '../entity/influencer';
import { InfluencerCartItem } from '../entity/cart';
import { User, RefreshToken } from '../entity/auth';
import { BillingDetails } from '../entity/billingDetails';
import { OTP } from '../entity/auth';
import {
    Option,
    Question,
    OnboardingQuestion,
    UserOnboardingSelection,
} from '../entity/onboarding';
import { CouponCode, UserCoupon } from '../entity/couponCode';
import { Bounty, BountySubmission } from '../entity/bounty';


export const AppDataSource = new DataSource({
    type: 'postgres',
    host: ENV.DB_HOST,
    port: parseInt(ENV.DB_PORT),
    username: ENV.DB_USERNAME,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_DATABASE,
    synchronize: true,
    logging: false,
    entities: [
        User,
        Influencer,
        Package,
        PackageItem,
        InfluencerCartItem,
        Cart,
        PackageCartItem,
        Checkout,
        UserOnboardingSelection,
        Question,
        Option,
        OnboardingQuestion,
        RefreshToken,
        BillingDetails,
        UserCoupon,
        CouponCode,
        OTP,
        Bounty,
        BountySubmission
    ],
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    ssl: {
        rejectUnauthorized: false,
    },
});
