const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_secret_key'; // Replace with a strong secret key

// Load existing license keys from environment variables
let licenseKeys = [];
if (process.env.LICENSE_KEYS) {
    licenseKeys = JSON.parse(process.env.LICENSE_KEYS);
}

// Middleware to check token
function authenticateToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) reject('Forbidden');
            resolve(user);
        });
    });
}

exports.handler = async (event, context) => {
    const { path, httpMethod, headers, body } = event;

    switch (path) {
        case '/.netlify/functions/api/login':
            if (httpMethod === 'POST') {
                const { username, password } = JSON.parse(body);
                // Replace with your actual authentication logic
                if (username === 'admin' && password === 'fanpager') {
                    const user = { name: username };
                    const token = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ token }),
                    };
                } else {
                    return {
                        statusCode: 403,
                        body: 'Invalid credentials',
                    };
                }
            }
            break;

        case '/.netlify/functions/api/validate-license-key':
            if (httpMethod === 'POST') {
                const { key } = JSON.parse(body);
                const valid = licenseKeys.includes(key);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ valid }),
                };
            }
            break;

        case '/.netlify/functions/api/add-license-key':
            if (httpMethod === 'POST') {
                const authHeader = headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (!token) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                try {
                    await authenticateToken(token);
                } catch (error) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                const { key } = JSON.parse(body);
                if (!key) {
                    return {
                        statusCode: 400,
                        body: 'License key is required',
                    };
                }

                if (licenseKeys.includes(key)) {
                    return {
                        statusCode: 400,
                        body: 'License key already exists',
                    };
                }

                licenseKeys.push(key);
                // Update the environment variable (Note: This won't persist across function invocations)
                process.env.LICENSE_KEYS = JSON.stringify(licenseKeys);
                return {
                    statusCode: 200,
                    body: 'License key added successfully',
                };
            }
            break;

        case '/.netlify/functions/api/delete-license-key':
            if (httpMethod === 'DELETE') {
                const authHeader = headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (!token) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                try {
                    await authenticateToken(token);
                } catch (error) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                const { key } = JSON.parse(body);
                if (!key) {
                    return {
                        statusCode: 400,
                        body: 'License key is required',
                    };
                }

                const index = licenseKeys.indexOf(key);
                if (index === -1) {
                    return {
                        statusCode: 404,
                        body: 'License key not found',
                    };
                }

                licenseKeys.splice(index, 1);
                // Update the environment variable (Note: This won't persist across function invocations)
                process.env.LICENSE_KEYS = JSON.stringify(licenseKeys);
                return {
                    statusCode: 200,
                    body: 'License key deleted successfully',
                };
            }
            break;

        case '/.netlify/functions/api/license-keys':
            if (httpMethod === 'GET') {
                const authHeader = headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (!token) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                try {
                    await authenticateToken(token);
                } catch (error) {
                    return {
                        statusCode: 403,
                        body: 'Forbidden',
                    };
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify(licenseKeys),
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
};