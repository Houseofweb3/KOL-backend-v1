import HttpStatus from 'http-status-codes';
import { IsNull } from 'typeorm';
import { validate as uuidValidate } from 'uuid';
import { AppDataSource } from '../../../config/data-source';
import { Blog } from '../../../entity/blog.entity';
import {
    BLOG_AUTHOR_MAX_LEN,
    BLOG_COVER_IMAGE_MAX_LEN,
    BLOG_SEO_DESCRIPTION_MAX_LEN,
    BLOG_SEO_KEYWORDS_MAX_LEN,
    BLOG_SEO_TITLE_MAX_LEN,
    BLOG_SLUG_MAX_LEN,
    BLOG_SLUG_REGEX,
    BLOG_TEASER_MAX_LEN,
    BLOG_TITLE_MAX_LEN,
} from '../../../constants/blog';

export interface BlogListItemDTO {
    id: string;
    title: string;
    slug: string;
    teaser: string;
    coverImage: string;
    author: string;
    createdAt: Date;
}

/** Public list cards: summary fields plus cover and SEO for listing pages (no auth). */
export interface BlogPublicListItemDTO {
    id: string;
    title: string;
    slug: string;
    teaser: string;
    coverImage: string;
    author: string;
    createdAt: Date;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
}

export interface BlogDetailDTO extends BlogListItemDTO {
    content: string;
    /** SEO `<title>` / og:title style override (optional in forms; empty string if unset). */
    seoTitle: string;
    /** Meta description. */
    seoDescription: string;
    /** Meta keywords (e.g. comma-separated). */
    seoKeywords: string;
    updatedAt: Date;
}

function assertUuid(id: string, label: string): void {
    if (!uuidValidate(id)) {
        const err = new Error(`Invalid ${label}`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
}

function normalizeSlug(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parseSeoField(raw: unknown, maxLen: number, label: string): string {
    if (raw === undefined || raw === null) return '';
    const s = String(raw).trim();
    if (s.length > maxLen) {
        const err = new Error(`${label} must be at most ${maxLen} characters`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return s;
}

function validateSlug(slug: string): void {
    if (!slug || slug.length > BLOG_SLUG_MAX_LEN) {
        const err = new Error(`Slug is required and must be at most ${BLOG_SLUG_MAX_LEN} characters`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!BLOG_SLUG_REGEX.test(slug)) {
        const err = new Error(
            'Invalid slug. Use lowercase letters, numbers, and single hyphens only (e.g. my-post-title).'
        );
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
}

function mapListRow(b: Blog): BlogListItemDTO {
    return {
        id: b.id,
        title: b.title ?? '',
        slug: b.slug ?? '',
        teaser: b.teaser ?? '',
        coverImage: b.coverImage ?? '',
        author: b.author ?? '',
        createdAt: b.createdAt,
    };
}

function mapPublicListRow(b: Blog): BlogPublicListItemDTO {
    return {
        ...mapListRow(b),
        coverImage: b.coverImage ?? '',
        seoTitle: b.seoTitle ?? '',
        seoDescription: b.seoDescription ?? '',
        seoKeywords: b.seoKeywords ?? '',
    };
}

function mapDetail(b: Blog): BlogDetailDTO {
    return {
        ...mapListRow(b),
        content: b.content ?? '',
        seoTitle: b.seoTitle ?? '',
        seoDescription: b.seoDescription ?? '',
        seoKeywords: b.seoKeywords ?? '',
        updatedAt: b.updatedAt,
    };
}

export async function listBlogs(): Promise<BlogListItemDTO[]> {
    const repo = AppDataSource.getRepository(Blog);
    const rows = await repo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
    });
    return rows.map(mapListRow);
}

export async function listPublicBlogs(): Promise<BlogPublicListItemDTO[]> {
    const repo = AppDataSource.getRepository(Blog);
    const rows = await repo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
    });
    return rows.map(mapPublicListRow);
}

export async function getBlogBySlug(slug: string): Promise<BlogDetailDTO> {
    const normalized = normalizeSlug(slug);
    validateSlug(normalized);
    const repo = AppDataSource.getRepository(Blog);
    const blog = await repo.findOne({ where: { slug: normalized, deletedAt: IsNull() } });
    if (!blog) {
        const err = new Error('Blog not found');
        (err as { status?: number }).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    return mapDetail(blog);
}

export interface CreateBlogInput {
    title: string;
    slug: string;
    teaser: string;
    coverImage: string;
    content: string;
    author?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
}

export async function createBlog(input: CreateBlogInput, defaultAuthor: string): Promise<BlogDetailDTO> {
    const title = (input.title || '').trim();
    const slug = normalizeSlug(input.slug || '');
    const teaser = (input.teaser || '').trim();
    const coverImage = (input.coverImage || '').trim();
    const content = input.content != null ? String(input.content) : '';
    const author = (input.author || defaultAuthor).trim();
    const seoTitle = parseSeoField(input.seoTitle, BLOG_SEO_TITLE_MAX_LEN, 'seoTitle');
    const seoDescription = parseSeoField(input.seoDescription, BLOG_SEO_DESCRIPTION_MAX_LEN, 'seoDescription');
    const seoKeywords = parseSeoField(input.seoKeywords, BLOG_SEO_KEYWORDS_MAX_LEN, 'seoKeywords');

    if (!title || title.length > BLOG_TITLE_MAX_LEN) {
        const err = new Error(`Title is required (max ${BLOG_TITLE_MAX_LEN} characters)`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    validateSlug(slug);
    if (!teaser || teaser.length > BLOG_TEASER_MAX_LEN) {
        const err = new Error(`Teaser is required (max ${BLOG_TEASER_MAX_LEN} characters)`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!coverImage || coverImage.length > BLOG_COVER_IMAGE_MAX_LEN) {
        const err = new Error(`Cover image URL is required (max ${BLOG_COVER_IMAGE_MAX_LEN} characters)`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!content.trim()) {
        const err = new Error('Content is required');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!author || author.length > BLOG_AUTHOR_MAX_LEN) {
        const err = new Error(`Author is required (max ${BLOG_AUTHOR_MAX_LEN} characters)`);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const repo = AppDataSource.getRepository(Blog);
    const blog = repo.create({
        title,
        slug,
        teaser,
        coverImage,
        content,
        author,
        seoTitle,
        seoDescription,
        seoKeywords,
    });
    try {
        const saved = await repo.save(blog);
        return mapDetail(saved);
    } catch (e: unknown) {
        const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined;
        if (code === '23505') {
            const err = new Error('A blog with this slug already exists');
            (err as { status?: number }).status = HttpStatus.CONFLICT;
            throw err;
        }
        throw e;
    }
}

export interface UpdateBlogInput {
    title?: string;
    slug?: string;
    teaser?: string;
    coverImage?: string;
    content?: string;
    author?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
}

export async function updateBlog(id: string, patch: UpdateBlogInput): Promise<BlogDetailDTO> {
    assertUuid(id, 'blog id');
    const repo = AppDataSource.getRepository(Blog);
    const blog = await repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!blog) {
        const err = new Error('Blog not found');
        (err as { status?: number }).status = HttpStatus.NOT_FOUND;
        throw err;
    }

    if (patch.title !== undefined) {
        const t = patch.title.trim();
        if (!t || t.length > BLOG_TITLE_MAX_LEN) {
            const err = new Error(`Title must be non-empty (max ${BLOG_TITLE_MAX_LEN} characters)`);
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        blog.title = t;
    }
    if (patch.slug !== undefined) {
        const s = normalizeSlug(patch.slug);
        validateSlug(s);
        blog.slug = s;
    }
    if (patch.teaser !== undefined) {
        const t = patch.teaser.trim();
        if (!t || t.length > BLOG_TEASER_MAX_LEN) {
            const err = new Error(`Teaser must be non-empty (max ${BLOG_TEASER_MAX_LEN} characters)`);
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        blog.teaser = t;
    }
    if (patch.coverImage !== undefined) {
        const c = patch.coverImage.trim();
        if (!c || c.length > BLOG_COVER_IMAGE_MAX_LEN) {
            const err = new Error(`Cover image must be non-empty (max ${BLOG_COVER_IMAGE_MAX_LEN} characters)`);
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        blog.coverImage = c;
    }
    if (patch.content !== undefined) {
        const c = String(patch.content);
        if (!c.trim()) {
            const err = new Error('Content must be non-empty');
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        blog.content = c;
    }
    if (patch.author !== undefined) {
        const a = patch.author.trim();
        if (!a || a.length > BLOG_AUTHOR_MAX_LEN) {
            const err = new Error(`Author must be non-empty (max ${BLOG_AUTHOR_MAX_LEN} characters)`);
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        blog.author = a;
    }
    if (patch.seoTitle !== undefined) {
        blog.seoTitle = parseSeoField(patch.seoTitle, BLOG_SEO_TITLE_MAX_LEN, 'seoTitle');
    }
    if (patch.seoDescription !== undefined) {
        blog.seoDescription = parseSeoField(patch.seoDescription, BLOG_SEO_DESCRIPTION_MAX_LEN, 'seoDescription');
    }
    if (patch.seoKeywords !== undefined) {
        blog.seoKeywords = parseSeoField(patch.seoKeywords, BLOG_SEO_KEYWORDS_MAX_LEN, 'seoKeywords');
    }

    try {
        const saved = await repo.save(blog);
        return mapDetail(saved);
    } catch (e: unknown) {
        const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined;
        if (code === '23505') {
            const err = new Error('A blog with this slug already exists');
            (err as { status?: number }).status = HttpStatus.CONFLICT;
            throw err;
        }
        throw e;
    }
}

export async function deleteBlog(id: string): Promise<{ message: string }> {
    assertUuid(id, 'blog id');
    const repo = AppDataSource.getRepository(Blog);
    const blog = await repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!blog) {
        const err = new Error('Blog not found');
        (err as { status?: number }).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    blog.deletedAt = new Date();
    await repo.save(blog);
    return { message: 'Blog deleted' };
}
