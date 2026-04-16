import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import {
    BLOG_SEO_DESCRIPTION_MAX_LEN,
    BLOG_SEO_KEYWORDS_MAX_LEN,
    BLOG_SEO_TITLE_MAX_LEN,
} from '../constants/blog';

/**
 * Blog posts.
 *
 * **API:** `POST` requires title, slug, teaser, coverImage, content, and author (or default author).
 * Optional: `seoTitle`, `seoDescription`, `seoKeywords` for page meta / Open Graph style data.
 * **Database:** String columns are nullable with defaults where safe so TypeORM `synchronize` can
 * align legacy rows that still have NULLs. Slug has no empty-string default (unique constraint).
 * Prefer backfilling: `UPDATE blogs SET title = COALESCE(title,''), … WHERE … IS NULL`.
 */
@Entity('blogs')
export class Blog extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 500, nullable: true, default: '' })
    title!: string | null;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 320, nullable: true })
    slug!: string | null;

    @Column({ type: 'varchar', length: 2000, nullable: true, default: '' })
    teaser!: string | null;

    @Column({ type: 'varchar', length: 2000, name: 'cover_image', nullable: true, default: '' })
    coverImage!: string | null;

    @Column({ type: 'text', nullable: true, default: '' })
    content!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true, default: '' })
    author!: string | null;

    /** SEO / `<title>` override (optional). */
    @Column({ type: 'varchar', length: BLOG_SEO_TITLE_MAX_LEN, name: 'seo_title', nullable: true, default: '' })
    seoTitle!: string | null;

    /** Meta description (optional). */
    @Column({
        type: 'varchar',
        length: BLOG_SEO_DESCRIPTION_MAX_LEN,
        name: 'seo_description',
        nullable: true,
        default: '',
    })
    seoDescription!: string | null;

    /** Meta keywords, e.g. comma-separated (optional). */
    @Column({
        type: 'varchar',
        length: BLOG_SEO_KEYWORDS_MAX_LEN,
        name: 'seo_keywords',
        nullable: true,
        default: '',
    })
    seoKeywords!: string | null;
}
