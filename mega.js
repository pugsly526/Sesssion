import { Storage } from 'megajs';

// ================================
// CONFIGURATION
// ================================
const auth = {
    // ================================
    // ADD YOUR MEGA EMAIL HERE
    // ================================
    email: 'johndoelee01@gmail.com',

    // ================================
    // ADD YOUR MEGA PASSWORD HERE
    // ================================
    password: 'L)T^XTSeT)w[',

    userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const config = {
    // Minimum delay between uploads (ms)
    minDelay: 5000,
    // Maximum delay between uploads (ms)
    maxDelay: 15000,
    // Max uploads per hour
    maxUploadsPerHour: 20,
    // Max uploads per day
    maxUploadsPerDay: 100,
    // Session lifetime (ms) - refresh after 30 minutes
    sessionLifetime: 30 * 60 * 1000,
    // Max retry attempts on failure
    maxRetries: 3
};

// ================================
// SESSION MANAGEMENT
// ================================
let cachedStorage = null;
let sessionCreatedAt = 0;
let isConnecting = false;
let connectionPromise = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = (min, max) =>
    delay(Math.floor(Math.random() * (max - min + 1)) + min);

const closeStorage = async (storage) => {
    if (!storage) return;
    try {
        storage.close();
    } catch {}
};

const createStorage = async () => {
    const storage = await new Storage(auth).ready;
    return storage;
};

const getStorage = async () => {
    const now = Date.now();

    // Reuse existing valid session
    if (
        cachedStorage &&
        now - sessionCreatedAt < config.sessionLifetime
    ) {
        return cachedStorage;
    }

    // If already connecting, wait for the existing attempt
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    isConnecting = true;

    connectionPromise = (async () => {
        try {
            // Close old session if exists
            if (cachedStorage) {
                await closeStorage(cachedStorage);
                cachedStorage = null;
            }

            const storage = await createStorage();
            cachedStorage = storage;
            sessionCreatedAt = Date.now();
            return storage;
        } finally {
            isConnecting = false;
            connectionPromise = null;
        }
    })();

    return connectionPromise;
};

const invalidateSession = async () => {
    if (cachedStorage) {
        await closeStorage(cachedStorage);
        cachedStorage = null;
        sessionCreatedAt = 0;
    }
};

// ================================
// RATE LIMITING
// ================================
let lastUploadTime = 0;
let uploadsThisHour = 0;
let uploadsToday = 0;
let hourResetTime = Date.now();
let dayResetTime = Date.now();

const resetCountersIfNeeded = () => {
    const now = Date.now();

    if (now - hourResetTime >= 60 * 60 * 1000) {
        uploadsThisHour = 0;
        hourResetTime = now;
    }

    if (now - dayResetTime >= 24 * 60 * 60 * 1000) {
        uploadsToday = 0;
        dayResetTime = now;
    }
};

const checkRateLimits = () => {
    resetCountersIfNeeded();

    if (uploadsThisHour >= config.maxUploadsPerHour) {
        const waitMs = hourResetTime + 60 * 60 * 1000 - Date.now();
        throw new Error(
            `Hourly upload limit reached. Try again in ${Math.ceil(waitMs / 60000)} minutes.`
        );
    }

    if (uploadsToday >= config.maxUploadsPerDay) {
        const waitMs = dayResetTime + 24 * 60 * 60 * 1000 - Date.now();
        throw new Error(
            `Daily upload limit reached. Try again in ${Math.ceil(waitMs / 3600000)} hours.`
        );
    }
};

const waitForUploadSlot = async () => {
    const now = Date.now();
    const timeSinceLast = now - lastUploadTime;

    // If first upload, just add a small delay
    if (lastUploadTime === 0) {
        await randomDelay(1000, 3000);
        return;
    }

    // Random delay between uploads to appear human-like
    const requiredDelay = Math.floor(
        Math.random() * (config.maxDelay - config.minDelay + 1) + config.minDelay
    );

    if (timeSinceLast < requiredDelay) {
        const waitTime = requiredDelay - timeSinceLast;
        console.log(`[MEGA] Waiting ${Math.round(waitTime / 1000)}s before next upload...`);
        await delay(waitTime);
    }
};

const recordUpload = () => {
    lastUploadTime = Date.now();
    uploadsThisHour++;
    uploadsToday++;
};

// ================================
// ERROR DETECTION
// ================================
const isSessionError = (error) => {
    const msg = (error?.message || '').toLowerCase();
    return (
        msg.includes('session') ||
        msg.includes('sid') ||
        msg.includes('not logged') ||
        msg.includes('expired') ||
        msg.includes('eagain') ||
        msg.includes('-3') || // EAGAIN
        msg.includes('-15') // ESID (session id expired)
    );
};

const isLockedError = (error) => {
    const msg = (error?.message || '').toLowerCase();
    return (
        msg.includes('locked') ||
        msg.includes('blocked') ||
        msg.includes('too many') ||
        msg.includes('rate limit') ||
        msg.includes('etoomany')
    );
};

// ================================
// MAIN UPLOAD FUNCTION
// ================================
export const upload = async (data, name, retryCount = 0) => {
    if (!auth.email || !auth.password) {
        throw new Error('MEGA email and password are required');
    }

    if (typeof data === 'string') {
        data = Buffer.from(data);
    }

    if (!Buffer.isBuffer(data)) {
        throw new TypeError('MEGA upload data must be a Buffer or string');
    }

    // Check rate limits before proceeding
    checkRateLimits();

    // Wait for a safe upload slot
    await waitForUploadSlot();

    let storage;

    try {
        storage = await getStorage();

        const file = await storage
            .upload(
                {
                    name,
                    size: data.length
                },
                data
            )
            .complete;

        const url = await file.link();

        if (!url) {
            throw new Error('Failed to generate MEGA file link');
        }

        recordUpload();
        return url;
    } catch (error) {
        // Handle locked account
        if (isLockedError(error)) {
            throw new Error(
                'MEGA account is locked or rate-limited. ' +
                'Please reset your password via email and update the password in your code.'
            );
        }

        // Handle session errors by refreshing and retrying
        if (isSessionError(error) && retryCount < config.maxRetries) {
            console.log(
                `[MEGA] Session error detected, refreshing session and retrying (${retryCount + 1}/${config.maxRetries})...`
            );

            await invalidateSession();

            // Wait before retrying
            await randomDelay(3000, 8000);

            return upload(data, name, retryCount + 1);
        }

        throw error;
    }
};

// ================================
// GRACEFUL SHUTDOWN
// ================================
export const shutdown = async () => {
    await invalidateSession();
};

process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
});
