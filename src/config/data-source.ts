import { DataSource } from "typeorm";
import { ENV } from "./env";
// import { Admin } from "../entity/auth/Admin.entity";
// import { Question } from "../entity/questionaries/Question.entity";
// import { Option } from "../entity/questionaries/Option.entity";
import { User } from "../entity/auth/User.entity";
// import { InfluencerPR } from "../entity/influencer/Influencer.entity";
// import { UserSelectedNiche } from "../entity/influencer/UserSelectedNiche.entity";
// import { UserSelections } from "../entity/onboarding/UserOnboardingSelection.entity";
// import { UserReferencePriority } from "../entity/influencer/UserReferencePriority.entity";
import { Package } from "../entity/package/Package.entity";
import { PackageItem } from "../entity/package/PackageItem.entity";
import { InfluencerCart } from "../entity/cart/InfluencerCart.entity";
import { InfluencerCartItem } from "../entity/cart/InfluencerCartItem.entity";
import { PackageCart } from "../entity/cart/PackageCart.entity";
import { PackageCartItem } from "../entity/cart/PackageCartItem.entity";
import { CheckoutDetails } from "../entity/checkout/Checkout.entity";
import { UserCheckoutInfluencer } from "../entity/checkout/UserCheckoutInfluencer.entity";
import { UserCheckoutPackages } from "../entity/checkout/UserCheckoutPackages.entity";
import { UserOnboardingSelection } from "../entity/influencer";
import { Question, Option } from "../entity/onboarding";

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
    // Admin,
    // Question,
    // Option,
    User,
    // InfluencerPR,
    // UserSelectedNiche,
    // UserSelections,
    // UserReferencePriority,
    Package,
    PackageItem,
    InfluencerCart,
    InfluencerCartItem,
    PackageCart,
    PackageCartItem,
    CheckoutDetails,
    UserCheckoutInfluencer,
    UserCheckoutPackages,
    UserOnboardingSelection,
    Question,
    Option,
  ],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  ssl: {
    rejectUnauthorized: false,
  },
});
