import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { Checkout } from '../checkout/Checkout.entity';

@Entity()
export class BillingDetails extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100 })
    firstName!: string;

    @Column({ type: 'varchar', length: 100 })
    lastName!: string;

    @Column({ type: 'varchar', length: 255 })
    projectName!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    telegramId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    projectUrl?: string;

    // add Campaign Live Date field
    @Column({ type: 'timestamp', nullable: true })
    campaignLiveDate?: Date;

    // add proposal status field
    @Column({ type: 'varchar', length: 100, nullable: true })
    proposalStatus?: string;

    // add invoice status field
    @Column({ type: 'varchar', length: 100, nullable: true })
    invoiceStatus?: string;

    // add payment status field
    @Column({ type: 'varchar', length: 100, nullable: true })
    paymentStatus?: string;

    //add total amount field
    @Column({ type: 'decimal', nullable: true })
    totalAmount?: number;

    // add ,management fee percentage field
    @Column({ type: 'decimal', nullable: true })
    managementFeePercentage?: number;

    //add note field
    @Column({ type: 'text', nullable: true })
    note?: string;

    @OneToOne(() => Checkout)
    @JoinColumn({ name: 'checkout_id' })
    checkout!: Checkout;
}
