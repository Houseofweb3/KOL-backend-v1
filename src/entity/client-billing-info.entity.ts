import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Client } from './client.entity';

/** Preferred payment mode for client billing. */
export type ClientPaymentMode = 'bank_transfer' | 'crypto';

/**
 * Billing information associated with a Client (one per client).
 *
 * This is separate from `BillingInfo` (which is one-per-cart for proposal confirmation).
 */
@Entity('client_billing_info')
export class ClientBillingInfo extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column({ type: 'uuid', unique: true, name: 'client_id' })
    clientId!: string;

    @OneToOne(() => Client, (c) => c.billingInfo, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client!: Client;

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
    preferredPaymentMode!: ClientPaymentMode;

    @Column({ type: 'text', nullable: true, name: 'docusign_proof_link' })
    docusignProofLink!: string | null;

    @Column({ type: 'boolean', name: 'is_terms_confirmed', default: false })
    isTermsConfirmed!: boolean;
}

