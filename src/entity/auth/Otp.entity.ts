import { Entity, Column, Index, Unique, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity("otps")
@Unique(["phoneNumber", "otpCode", "isUsed"])  // Ensures uniqueness for unused OTPs per phone number
export class OTP extends BaseModel {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ name: "phone_number", nullable: true })
    phoneNumber!: string;

    // add email column
    @Index()
    @Column({ name: "email", nullable: true })
    email!: string;

    @Index()
    @Column({ name: "otp_code" })
    otpCode!: string;

    @Column({ name: "expires_at", type: "bigint" })
    expiresAt!: number;

    @Column({ name: "is_used", default: false })
    isUsed!: boolean;
}
