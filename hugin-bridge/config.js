/**
 * Configuration Module
 * Config.json dosyasını yükler ve export eder
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

let config = {};

try {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
} catch (error) {
    console.error('Config dosyası okunamadı, varsayılan ayarlar kullanılıyor');
    config = {
        port: 3000,
        defaultPort: 'auto',
        baudRate: 9600,
        autoConnect: false,
        firmName: 'KahvePOS',
        firmAddress: '',
        vkn: '',
        taxRate: 20,
        currency: 'TRY',
        language: 'tr'
    };
}

module.exports = config;
