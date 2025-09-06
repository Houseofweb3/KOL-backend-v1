import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('dr')
export class Dr {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    website!: string;

    @Column({ type: 'varchar', length: 500 })
    deliverables!: string;

    @Column({ type: 'int' })
    dr!: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price!: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;
}
