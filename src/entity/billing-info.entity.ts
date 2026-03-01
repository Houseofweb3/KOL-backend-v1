import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Cart } from './cart.entity';

/** Preferred payment mode for proposal confirmation. */
export type PaymentMode = 'bank_transfer' | 'crypto';

/**
 * Billing information submitted by client when confirming proposal (one per cart).
 */
@Entity('billing_info')
export class BillingInfo extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', unique: true, name: 'cart_id' })
    cartId!: string;

    @OneToOne(() => Cart, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

    @Column({ type: 'varchar', length: 255, name: 'registered_company_name' })
    registeredCompanyName!: string;

    @Column({ type: 'text', name: 'registered_company_address' })
    registeredCompanyAddress!: string;

    @Column({ type: 'varchar', length: 255, name: 'authorized_signatory_name' })
    authorizedSignatoryName!: string;

    @Column({ type: 'varchar', length: 255, name: 'authorized_signatory_designation' })
    authorizedSignatoryDesignation!: string;

    @Column({ type: 'varchar', length: 255, name: 'official_email_id' })
    officialEmailId!: string;

    @Column({ type: 'varchar', length: 50, name: 'phone_number' })
    phoneNumber!: string;

    @Column({ type: 'varchar', length: 50, name: 'preferred_payment_mode' })
    preferredPaymentMode!: PaymentMode;

    @Column({ type: 'text', nullable: true, name: 'docusign_proof_link' })
    docusignProofLink!: string | null;

    @Column({ type: 'boolean', name: 'is_terms_confirmed', default: false })
    isTermsConfirmed!: boolean;
}
