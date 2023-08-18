const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const JWT_TOKEN = process.env.JWT_TOKEN;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;

async function isTokenValid(accessToken) {
    try {
        const response = await axios.get('https://api.airslate.io/v1/organizations', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('API Response:', response.data);  // Log the output of the API call

        return true; // If request is successful, token is valid.
    } catch (error) {
        if (error.response && error.response.status === 401) {
            return false; // Token is not valid.
        }
        throw error; // Some other error occurred.
    }
}

async function getAccessToken() {
    try {
        const response = await axios.post('https://oauth.airslate.com/public/oauth/token', `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(JWT_TOKEN)}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            auth: {
                username: clientId,
                password: clientSecret
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error obtaining access token:', error.message);
        if (error.response) {
            console.error('Error response body:', error.response.data);
        }
        throw error;
    }
}

async function main() {
    try {
        // Check if we have a token, and if it's valid
        if (ACCESS_TOKEN && await isTokenValid(ACCESS_TOKEN)) {
            console.log('Existing access token is valid.');
            return;
        }

        console.log('Fetching a new access token...');
        ACCESS_TOKEN = await getAccessToken();

        // Update the .env file with the new access token
        const envContents = `ACCESS_TOKEN=${ACCESS_TOKEN}\nCLIENT_ID=${clientId}\nCLIENT_SECRET=${clientSecret}\nJWT_TOKEN=${JWT_TOKEN}`;
        fs.writeFileSync('.env', envContents);

        console.log('New access token obtained and saved in .env');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
