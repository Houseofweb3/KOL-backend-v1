import { DataSource } from "typeorm";
import { ENV } from "./env";
import { Admin } from "../entity/auth/Admin";
import { Question } from "../entity/questionaries/Question";
import { Option } from "../entity/questionaries/Option";
import { User } from "../entity/auth/User";
import { InfluencerPR } from "../entity/influencer/InfluencerPR";
import { UserSelectedNiche } from "../entity/user/UserSelectedNiche";
import { UserSelectedOptions } from "../entity/user/UserSelectedOptions";
import { UserReferencePriority } from "../entity/user/UserReferencePriority";
import { Package } from "../entity/package/Package";
import { InfluencerCart } from "../entity/influencer/InfluencerCart";
import { PackageCart } from "../entity/package/PackageCart";
import { CheckoutDetails } from "../entity/checkout/CheckoutDetails";
import { UserCheckoutInfluencer } from "../entity/checkout/UserCheckoutInfluencer";
import { UserCheckoutPackages } from "../entity/checkout/UserCheckoutPackages";

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
    Admin,
    Question,
    Option,
    User,
    InfluencerPR,
    UserSelectedNiche,
    UserSelectedOptions,
    UserReferencePriority,
    Package,
    InfluencerCart,
    PackageCart,
    CheckoutDetails,
    UserCheckoutInfluencer,
    UserCheckoutPackages,
  ],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  ssl: {
    rejectUnauthorized: false,
  },
});
