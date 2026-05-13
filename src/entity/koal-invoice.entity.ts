import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Influencer } from './influencer.entity';
import type {
    KoalInvoicePaymentDetails,
    KoalInvoiceProjectLine,
    KoalInvoiceStatus,
} from '../constants/koal-invoice';

@Entity('koal_invoices')
export class KoalInvoice extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, name: 'invoice_number' })
    invoiceNumber!: string;

    @Column({ type: 'date', name: 'invoice_date' })
    invoiceDate!: string;

    /** Party the invoice is from (PDF: name / platform as designation). */
    @Column({ type: 'uuid', name: 'from_influencer_id' })
    fromInfluencerId!: string;

    @ManyToOne(() => Influencer, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'from_influencer_id' })
    fromInfluencer!: Influencer;

    /** Who issued the invoice (influencer reference). */
    @Column({ type: 'uuid', name: 'invoice_by_influencer_id' })
    invoiceByInfluencerId!: string;

    @ManyToOne(() => Influencer, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'invoice_by_influencer_id' })
    invoiceByInfluencer!: Influencer;

    @Column({ type: 'jsonb' })
    deliverables!: string[];

    @Column({ type: 'jsonb' })
    projects!: KoalInvoiceProjectLine[];

    @Column({ type: 'decimal', precision: 18, scale: 2, name: 'amount_payable' })
    amountPayable!: string;

    @Column({ type: 'varchar', length: 16, name: 'payment_details' })
    paymentDetails!: KoalInvoicePaymentDetails;

    @Index()
    @Column({ type: 'varchar', length: 16, name: 'invoice_status', default: 'unpaid' })
    status!: KoalInvoiceStatus;

    /** Bank / UPI reference when payment is received (required when `status` is `paid`). */
    @Column({ type: 'varchar', length: 191, nullable: true, name: 'payment_utr' })
    utr!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'bank_account_holder_name' })
    bankAccountHolderName!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'bank_name' })
    bankName!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_account_number_iban' })
    bankAccountNumberOrIban!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_swift_ifsc' })
    bankSwiftOrIfsc!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_country' })
    bankCountry!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'crypto_chain_address' })
    cryptoChainAddress!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'crypto_wallet_address' })
    cryptoWalletAddress!: string | null;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
