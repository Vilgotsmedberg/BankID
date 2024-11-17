const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI; // Use environment variable for MongoDB connection string
const client = new MongoClient(uri);

let isConnected = false;

async function connectToDatabase() {
    if (!isConnected) {
        console.log('Connecting to MongoDB...');
        await client.connect();
        isConnected = true;
        console.log('Connected to MongoDB');
    }
    return client.db('BankData'); // Use the correct database name
}

exports.handler = async (event, context) => {
    const { path, httpMethod, body } = event;

    console.log('Request Path:', path);
    console.log('HTTP Method:', httpMethod);
    console.log('Request Body:', body);

    try {
        const db = await connectToDatabase();
        const licenseKeysCollection = db.collection('licenseKeys');
        const userInfoCollection = db.collection('userInfo');

        switch (path) {
            case '/.netlify/functions/api/validate-license-key':
                if (httpMethod === 'POST') {
                    const { key } = JSON.parse(body || '{}');
                    console.log('Validating license key:', key);
                    const licenseKey = await licenseKeysCollection.findOne({ key });
                    console.log('License key found:', licenseKey);
                    const valid = !!licenseKey;
                    const userInfo = await userInfoCollection.findOne({ key });
                    console.log('Validation result:', { valid, userInfo });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ valid, userInfo: userInfo || null }),
                    };
                }
                break;

            case '/.netlify/functions/api/get-user-info':
                if (httpMethod === 'POST') {
                    const { key } = JSON.parse(body || '{}');
                    console.log('Retrieving user info for key:', key);
                    const userInfo = await userInfoCollection.findOne({ key });
                    console.log('User info:', userInfo);
                    return {
                        statusCode: 200,
                        body: JSON.stringify(userInfo || {}),
                    };
                }
                break;

            case '/.netlify/functions/api/list-license-keys':
                if (httpMethod === 'GET') {
                    console.log('Listing all license keys');
                    const licenseKeys = await licenseKeysCollection.find().toArray();
                    console.log('License keys:', licenseKeys);
                    return {
                        statusCode: 200,
                        body: JSON.stringify(licenseKeys.map(key => key.key)),
                    };
                }
                break;

            default:
                return {
                    statusCode: 404,
                    body: 'Not Found',
                };
        }

        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'Internal Server Error',
        };
    }
};