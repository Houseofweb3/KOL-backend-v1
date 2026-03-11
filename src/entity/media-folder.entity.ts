import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { MediaFile } from './media-file.entity';

@Entity('media_folders')
export class MediaFolder extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
    parentId!: string | null;

    @OneToMany(() => MediaFile, (f) => f.folder)
    files!: MediaFile[];
}
