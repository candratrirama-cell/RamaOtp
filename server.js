const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Fungsi pembuat Signature HMAC-SHA256
function generateSignature(body) {
    const rawBody = JSON.stringify(body);
    return crypto
        .createHmac('sha256', config.API_KEY)
        .update(rawBody)
        .digest('hex');
}

// Endpoint untuk Generate QRIS
app.post('/api/donate', async (req, res) => {
    const { amount } = req.body;
    
    // ID Transaksi Unik untuk RZONE
    const partnerReferenceNo = `RZ-${Date.now()}`;

    const requestBody = {
        amount: parseInt(amount),
        partnerReferenceNo: partnerReferenceNo,
        expirySeconds: 300 
    };

    const signature = generateSignature(requestBody);

    try {
        const response = await axios.post(`${config.BASE_URL}/v1/generate_qris`, requestBody, {
            headers: {
                'X-Merchant-Code': config.MERCHANT_CODE,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });
        
        // Kirim data ke frontend (termasuk partnerReferenceNo untuk pengecekan)
        res.json({
            ...response.data,
            partnerReferenceNo: partnerReferenceNo
        });
    } catch (error) {
        console.error("Error API Hokto:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal menghubungi server payment' });
    }
});

// Endpoint untuk Cek Status Otomatis
app.post('/api/check-status', async (req, res) => {
    const requestBody = {
        partnerReferenceNo: req.body.partnerReferenceNo
    };

    const signature = generateSignature(requestBody);

    try {
        const response = await axios.post(`${config.BASE_URL}/v1/cek_status`, requestBody, {
            headers: {
                'X-Merchant-Code': config.MERCHANT_CODE,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal cek status' });
    }
});

app.listen(3000, () => console.log('Donasi RZONE aktif di port 3000'));
