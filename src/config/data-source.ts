import { DataSource } from "typeorm";

import { ENV } from "./env";
import { Cart } from "../entity/cart";
import { User } from "../entity/auth/user.entity";
import { Influencer } from "../entity/influencer";
import { Package } from "../entity/package/Package.entity";
import { Checkout } from "../entity/checkout/checkout.entity";
import { PackageItem } from "../entity/package/PackageItem.entity";
import { PackageCartItem } from "../entity/cart/packageCartItem.entity";
import { InfluencerCartItem } from "../entity/cart/influencerCartItem.entity";
import {
    Option,
    Question,
    OnboardingQuestion,
    UserOnboardingSelection
} from "../entity/onboarding";

export const AppDataSource = new DataSource({
  type: "postgres",
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
  ],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  ssl: {
    rejectUnauthorized: false,
  },
});
