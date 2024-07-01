import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Admin } from "./entity/Admin";
import { Question } from "./entity/Question";
import { Option } from "./entity/Option";
import { InfluencerPR } from "./entity/InfluencerPR";
import { UserSelectedNiche } from "./entity/UserSelectedNiche";
import { UserSelectedOptions } from "./entity/UserSelectedOptions";
import { UserReferencePriority } from "./entity/UserReferencePriority";
import { PackageHeader } from "./entity/PackageHeader";
import { Packages } from "./entity/Packages";
import { InfluencerCart } from "./entity/InfluencerCart";
import { PackageCart } from "./entity/PackageCart";
import { CheckoutDetails } from "./entity/CheckoutDetails";
import { UserCheckoutInfluencer } from "./entity/UserCheckoutInfluencer";
import { UserCheckoutPackages } from "./entity/UserCheckoutPackages";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: "postgres://postgres:ba8DUPGV5cIufXIef6np@database-2.ce6qhznpf2i4.us-east-1.rds.amazonaws.com:5432/kol-tool-v1",
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
        UserCheckoutPackages
    ],
    migrations: [],
    subscribers: [],
    ssl: {
        rejectUnauthorized: false
    }
});
