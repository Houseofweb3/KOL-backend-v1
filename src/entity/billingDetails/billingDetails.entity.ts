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

    @OneToOne(() => Checkout)
    @JoinColumn({ name: 'checkout_id' })
    checkout!: Checkout;
}
