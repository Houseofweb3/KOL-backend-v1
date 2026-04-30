/**
 * Open (unauthenticated) Ampli5 image uploads use this folder under the `media/` prefix.
 * Deletes/lists only accept keys starting with `media/${AMPLI5_UPLOAD_FOLDER}/`.
 */
export const AMPLI5_UPLOAD_FOLDER = 'ampli5';
export const AMPLI5_OBJECT_KEY_PREFIX = `media/${AMPLI5_UPLOAD_FOLDER}/`;

/**
 * Folder name used as second-level prefix: `media/ampli5/<folderName>/...`
 * Keep strict to avoid path traversal / unexpected prefixes.
 */
export const AMPLI5_FOLDER_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

