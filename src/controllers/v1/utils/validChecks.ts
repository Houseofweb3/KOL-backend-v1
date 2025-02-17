// Function to validate email format
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Function to validate Telegram ID (Can be a numeric ID or a username starting with "@")
export const isValidTelegramId = (telegramId?: string): boolean => {
    if (!telegramId) return true; // Optional field
    return /^(\d+|@\w{5,})$/.test(telegramId);
};

// Function to validate URLs
export const isValidUrl = (url?: string): boolean => {
    if (!url) return true; // Optional field
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};