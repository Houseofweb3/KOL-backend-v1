import { DataSource } from "typeorm";
import { ENV } from "./env";
import { Admin } from "../entity/Admin";
import { Question } from "../entity/Question";
import { Option } from "../entity/Option";
import { User } from "../entity/User";
import { InfluencerPR } from "../entity/InfluencerPR";
import { UserSelectedNiche } from "../entity/UserSelectedNiche";
import { UserSelectedOptions } from "../entity/UserSelectedOptions";
import { UserReferencePriority } from "../entity/UserReferencePriority";
import { PackageHeader } from "../entity/PackageHeader";
import { Packages } from "../entity/Packages";
import { InfluencerCart } from "../entity/InfluencerCart";
import { PackageCart } from "../entity/PackageCart";
import { CheckoutDetails } from "../entity/CheckoutDetails";
import { UserCheckoutInfluencer } from "../entity/UserCheckoutInfluencer";
import { UserCheckoutPackages } from "../entity/UserCheckoutPackages";

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
    PackageHeader,
    Packages,
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
