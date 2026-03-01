/**
 * User roles. Use these constants everywhere instead of string literals.
 * CLIENT = token type for web client auth (not a User role).
 */
export enum UserRole {
    ADMIN = 'admin',
    ADMIN_USER = 'admin_user',
    USER = 'user',
    CLIENT = 'client',
}

/** Default role when creating a new user. */
export const USER_ROLE_DEFAULT = UserRole.ADMIN;
