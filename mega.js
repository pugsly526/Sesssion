import { Storage } from 'megajs';

const auth = {
    email: 'johndoelee01@gmail.com',
    password: 'L)T^XTSeT)w[',
};

const config = {
    minDelay: 3000, // Minimum 3 seconds between uploads
    maxDelay: 8000, // Maximum 8 seconds delay
    maxUploadsPerHour: 20,
    maxUploadsPerDay: 100
};

class SafeMEGAUploader {
    constructor() {
        this.uploadCount = 0;
        this.hourlyCount = 0;
        this.lastReset = Date.now();
        this.lastUpload = 0;
    }

    async upload(data, name) {
        this.checkLimits();
        this.addDelay();
        
        // Randomize user agent
        const userAgent = this.getRandomUserAgent();
        
        let storage;
        try {
            storage = await new Storage({
                ...auth,
                userAgent
            }).ready;

            // Add small random delay before upload
            await this.randomDelay(500, 2000);

            const file = await storage
                .upload({ name, size: data.length }, data)
                .complete;

            const url = await file.link();
            
            this.updateCounts();
            return url;
            
        } finally {
            if (storage) {
                try { storage.close(); } catch {}
            }
        }
    }

    checkLimits() {
        const now = Date.now();
        
        // Reset hourly count
        if (now - this.lastReset > 3600000) {
            this.hourlyCount = 0;
            this.lastReset = now;
        }

        if (this.hourlyCount >= config.maxUploadsPerHour) {
            throw new Error('Hourly upload limit reached. Please wait.');
        }

        if (this.uploadCount >= config.maxUploadsPerDay) {
            throw new Error('Daily upload limit reached.');
        }
    }

    addDelay() {
        const timeSinceLast = Date.now() - this.lastUpload;
        const minDelay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
        
        if (timeSinceLast < minDelay) {
            const waitTime = minDelay - timeSinceLast;
            console.log(`Waiting ${Math.round(waitTime/1000)}s before next upload...`);
            return new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    randomDelay(min, max) {
        return new Promise(resolve => 
            setTimeout(resolve, Math.random() * (max - min) + min)
        );
    }

    updateCounts() {
        this.uploadCount++;
        this.hourlyCount++;
        this.lastUpload = Date.now();
    }

    getRandomUserAgent() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
    }
}

const uploader = new SafeMEGAUploader();
export { uploader };

// Usage
// const url = await uploader.upload(data, 'filename.txt');
