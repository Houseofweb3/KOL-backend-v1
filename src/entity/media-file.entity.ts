import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { MediaFolder } from './media-folder.entity';

export type MediaFileType = 'image' | 'document';

@Entity('media_files')
export class MediaFile extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', nullable: true, name: 'folder_id' })
    folderId!: string | null;

    @ManyToOne(() => MediaFolder, (f) => f.files, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'folder_id' })
    folder!: MediaFolder | null;

    @Column({ type: 'varchar', length: 512 })
    name!: string;

    @Column({ type: 'varchar', length: 512, name: 'storage_key' })
    storageKey!: string;

    @Column({ type: 'varchar', length: 255, name: 'mime_type' })
    mimeType!: string;

    @Column({ type: 'int', name: 'size_bytes' })
    sizeBytes!: number;

    @Column({ type: 'varchar', length: 20 })
    type!: MediaFileType;
}
