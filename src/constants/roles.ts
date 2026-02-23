/**
 * User roles. Use these constants everywhere instead of string literals.
 */
export enum UserRole {
    ADMIN = 'admin',
    ADMIN_USER = 'admin_user',
    USER = 'user',
}

/** Default role when creating a new user. */
export const USER_ROLE_DEFAULT = UserRole.ADMIN_USER;
