import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Client } from './client.entity';
import { Cart } from './cart.entity';

/**
 * Campaign/contact details for a cart. One record per cart; tracks who and how to contact for this cart.
 * clientId and cartId are set by the backend; the rest come from the create-cart payload.
 */
@Entity('cart_campaign_details')
@Unique(['cartId'])
export class CartCampaignDetails extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'project_name' })
    projectName!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'project_url' })
    projectUrl!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'telegram_id' })
    telegramId!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'whatsapp_number' })
    whatsAppNumber!: string | null;

    @Column({ type: 'uuid', name: 'client_id' })
    clientId!: string;

    @ManyToOne(() => Client, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client!: Client;

    @Column({ type: 'uuid', name: 'cart_id' })
    cartId!: string;

    @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}
