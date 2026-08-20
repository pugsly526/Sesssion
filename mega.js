import { Storage } from 'megajs';

const auth = {
    // ================================
    // ADD YOUR MEGA EMAIL HERE
    // ================================
    email: 'johndoelee01@gmail.com',

    // ================================
    // ADD YOUR MEGA PASSWORD HERE
    // ================================
    password: 'sanglee4691',

    userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

export const upload = async (data, name) => {
    if (!auth.email || !auth.password) {
        throw new Error('MEGA email and password are required');
    }

    if (typeof data === 'string') {
        data = Buffer.from(data);
    }

    if (!Buffer.isBuffer(data)) {
        throw new TypeError('MEGA upload data must be a Buffer or string');
    }

    let storage

    try {
        storage = await new Storage(auth).ready;

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

        return url;
    } finally {
        if (storage) {
            try {
                storage.close();
            } catch {}
        }
    }
};
