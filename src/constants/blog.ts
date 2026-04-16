/** Blog field limits (aligned with DB column sizes). */
export const BLOG_TITLE_MAX_LEN = 500;
export const BLOG_SLUG_MAX_LEN = 320;
export const BLOG_TEASER_MAX_LEN = 2000;
export const BLOG_AUTHOR_MAX_LEN = 255;
export const BLOG_COVER_IMAGE_MAX_LEN = 2000;

/** SEO / meta fields (optional on create; stored for `<title>`, meta description, meta keywords). */
export const BLOG_SEO_TITLE_MAX_LEN = 500;
export const BLOG_SEO_DESCRIPTION_MAX_LEN = 2000;
export const BLOG_SEO_KEYWORDS_MAX_LEN = 2000;

/** Allowed slug pattern: lowercase letters, numbers, single hyphens between segments. */
export const BLOG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Open (unauthenticated) blog image uploads use this folder under the `media/` prefix.
 * Deletes by URL only accept keys starting with `media/${BLOG_PUBLIC_UPLOAD_FOLDER}/`.
 */
export const BLOG_PUBLIC_UPLOAD_FOLDER = 'blog-public';

export const BLOG_PUBLIC_OBJECT_KEY_PREFIX = `media/${BLOG_PUBLIC_UPLOAD_FOLDER}/`;
