import HttpStatus from 'http-status-codes';

/** Per-platform collaboration proof from creator onboarding (Step 9). */
export interface PlatformCollaborationProof {
    postLink1?: string;
    postLink2?: string;
    image1?: string;
    image2?: string;
    image3?: string;
    image1PublicId?: string;
    image2PublicId?: string;
}

export function isValidHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function collaborationBadRequest(message: string): Error {
    const err = new Error(message);
    (err as Error & { status: number }).status = HttpStatus.BAD_REQUEST;
    return err;
}

/**
 * Merge `platformCollaborationProof` with legacy root fields on the first selected platform.
 */
export function resolvePlatformCollaborationProof(
    platforms: string[],
    platformCollaborationProof: Record<string, PlatformCollaborationProof> | undefined,
    legacy: {
        firstCollaborationPostLink1?: string;
        firstCollaborationPostLink2?: string;
        firstCollaborationImage1?: string;
        firstCollaborationImage2?: string;
        firstCollaborationImage3?: string;
    },
): Record<string, PlatformCollaborationProof> {
    const merged: Record<string, PlatformCollaborationProof> = { ...(platformCollaborationProof ?? {}) };
    if (platforms.length === 0) return merged;

    const first = platforms[0];
    const existing = merged[first] ?? {};
    merged[first] = {
        ...existing,
        postLink1: existing.postLink1 ?? legacy.firstCollaborationPostLink1,
        postLink2: existing.postLink2 ?? legacy.firstCollaborationPostLink2,
        image1: existing.image1 ?? legacy.firstCollaborationImage1,
        image2: existing.image2 ?? legacy.firstCollaborationImage2,
        image3: existing.image3 ?? legacy.firstCollaborationImage3,
    };
    return merged;
}

/** Validate required collaboration post links + screenshot URLs for each platform. */
export function validatePlatformCollaborationProof(
    platform: string,
    collab: PlatformCollaborationProof | undefined,
): void {
    const postLink1 = typeof collab?.postLink1 === 'string' ? collab.postLink1.trim() : '';
    const postLink2 = typeof collab?.postLink2 === 'string' ? collab.postLink2.trim() : '';
    const image1 = typeof collab?.image1 === 'string' ? collab.image1.trim() : '';
    const image2 = typeof collab?.image2 === 'string' ? collab.image2.trim() : '';

    if (!postLink1) {
        throw collaborationBadRequest(`Collaboration post link is required for ${platform} (Screenshot 1)`);
    }
    if (!postLink2) {
        throw collaborationBadRequest(`Collaboration post link is required for ${platform} (Screenshot 2)`);
    }
    if (!image1) {
        throw collaborationBadRequest(`Collaboration screenshot is required for ${platform} (Screenshot 1)`);
    }
    if (!image2) {
        throw collaborationBadRequest(`Collaboration screenshot is required for ${platform} (Screenshot 2)`);
    }

    if (!isValidHttpUrl(postLink1)) {
        throw collaborationBadRequest(
            `Collaboration post link must be a valid URL for ${platform} (Screenshot 1)`,
        );
    }
    if (!isValidHttpUrl(postLink2)) {
        throw collaborationBadRequest(
            `Collaboration post link must be a valid URL for ${platform} (Screenshot 2)`,
        );
    }
    if (!isValidHttpUrl(image1)) {
        throw collaborationBadRequest(
            `Collaboration screenshot must be a valid URL for ${platform} (Screenshot 1)`,
        );
    }
    if (!isValidHttpUrl(image2)) {
        throw collaborationBadRequest(
            `Collaboration screenshot must be a valid URL for ${platform} (Screenshot 2)`,
        );
    }
}
