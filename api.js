tconst jwt = require('jsonwebtoken');
const SECRET_KEY = 'secret_key'; // Replace with a strong secret key

// Load existing license keys and user information from environment variables
let licenseKeys = [];
let userInfo = {};
if (process.env.LICENSE_KEYS) {
    licenseKeys = JSON.parse(process.env.LICENSE_KEYS);
}
if (process.env.USER_INFO) {
    userInfo = JSON.parse(process.env.USER_INFO);
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

    console.log('Request Path:', path);
    console.log('HTTP Method:', httpMethod);
    console.log('Request Headers:', headers);
    console.log('Request Body:', body);

    switch (path) {
        case '/.netlify/functions/api/login':
            if (httpMethod === 'POST') {
                const { username, password } = JSON.parse(body);
                // Replace with your actual authentication logic
                if (username === 'username' && password === 'password') {
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
                    body: JSON.stringify({ valid, userInfo: userInfo[key] || null }),
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

                const { key, name, age, socialSecurityNumber, picture } = JSON.parse(body);
                if (!key || !name || !age || !socialSecurityNumber || !picture) {
                    return {
                        statusCode: 400,
                        body: 'License key, name, age, social secutiry number, and picture are required',
                    };
                }

                if (licenseKeys.includes(key)) {
                    return {
                        statusCode: 400,
                        body: 'License key already exists',
                    };
                }

                licenseKeys.push(key);
                userInfo[key] = { name, age, socialSecurityNumber, picture };
                // Update the environment variables (Note: This won't persist across function invocations)
                process.env.LICENSE_KEYS = JSON.stringify(licenseKeys);
                process.env.USER_INFO = JSON.stringify(userInfo);
                return {
                    statusCode: 200,
                    body: 'License key added successfully',
                };
            }
            break;

        case '/.netlify/functions/api/update-user-info':
            if (httpMethod === 'POST') {
                const { key, name, age, socialSecurityNumber, picture } = JSON.parse(body);
                console.log('Update User Info:', { key, name, age, socialSecurityNumber, picture });
                if (!key || !name || !age || !socialSecurityNumber || !picture) {
                    return {
                        statusCode: 400,
                        body: 'License key, name, age, social security number, and picture are required',
                    };
                }

                if (!licenseKeys.includes(key)) {
                    return {
                        statusCode: 400,
                        body: 'License key does not exist',
                    };
                }

                userInfo[key] = { name, age, socialSecurityNumber, picture };
                // Update the environment variables (Note: This won't persist across function invocations)
                process.env.USER_INFO = JSON.stringify(userInfo);
                return {
                    statusCode: 200,
                    body: 'User information updated successfully',
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
