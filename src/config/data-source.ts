import { DataSource } from 'typeorm';

import { ENV } from './env';
import { Cart } from '../entity/cart';
import { Package } from '../entity/package';
import { Checkout } from '../entity/checkout';
import { PackageItem } from '../entity/package';
import { PackageCartItem } from '../entity/cart';
import { Influencer } from '../entity/influencer';
import { InfluencerCartItem, DrCartItem } from '../entity/cart';
import { User, RefreshToken } from '../entity/auth';
import { BillingDetails } from '../entity/billingDetails';
import { CheckoutPr } from '../entity/checkoutPr';
import { BillingDetailsPr } from '../entity/billingDetailsPr';
import { OTP } from '../entity/auth';
import { Dr } from '../entity/dr';
import {
    Option,
    Question,
    OnboardingQuestion,
    UserOnboardingSelection,
} from '../entity/onboarding';
import { CouponCode, UserCoupon } from '../entity/couponCode';
import { Bounty, BountySubmission } from '../entity/bounty';
import { ProposalToken } from '../entity/proposalToken/ProposalToken.entity';
import { ProposalPrToken } from '../entity/proposalToken/ProposalPrToken.entity';


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
        DrCartItem,
        Cart,
        PackageCartItem,
        Checkout,
        UserOnboardingSelection,
        Question,
        Option,
        OnboardingQuestion,
        RefreshToken,
        BillingDetails,
        CheckoutPr,
        BillingDetailsPr,
        UserCoupon,
        CouponCode,
        OTP,
        Bounty,
        BountySubmission,
        Dr,
        ProposalToken,
        ProposalPrToken
    ],
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    ssl: {
        rejectUnauthorized: false,
    },
});
