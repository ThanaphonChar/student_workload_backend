import axios from 'axios';
import config from '../config/env.js';


/**
 * Verify user credentials with TU Auth API
 * @param {string} username - TU username (student ID or employee username)
 * @param {string} password - User password
 * @returns {Promise<Object>} TU Auth API response
 * @throws {Error} If authentication fails or service is unavailable
 */
export const verifyCredentials = async (username, password) => {
    const startTime = Date.now();

    try {
        // Build request URL
        const url = `${config.tuApi.authUrl}/auth/Ad/verify`;

        // Build request body matching TU API specification
        const requestBody = {
            UserName: username,
            PassWord: password,
        };

        // Build request headers
        const headers = {
            'Content-Type': 'application/json',
            'Application-Key': config.tuApi.applicationKey,
        };

        const prepTime = Date.now() - startTime;
        console.log(`[TU Auth] ⏱️  Request preparation: ${prepTime}ms`);
        console.log(`[TU Auth] 🔍 Verifying credentials for user: ${username}`);

        // Call TU Auth API with increased timeout
        const apiCallStart = Date.now();
        const response = await axios.post(url, requestBody, {
            headers,
            timeout: 30000, // 30 second timeout (increased from 10s)
        });
        const apiCallTime = Date.now() - apiCallStart;

        console.log(`[TU Auth] ⏱️  TU API call: ${apiCallTime}ms`);
        console.log(`[TU Auth] ⏱️  Total verifyCredentials time: ${Date.now() - startTime}ms`);

        // Return the response data
        return response.data;

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.log(`[TU Auth] ⏱️  Total time before error: ${totalTime}ms`);

        // Handle axios errors
        if (error.response) {
            // TU API responded with an error status
            console.error(`[TU Auth] ❌ API error: ${error.response.status}`, error.response.data);

            // Return the error response from TU API if available
            if (error.response.data) {
                return error.response.data;
            }

            throw new Error(`TU Auth API returned status ${error.response.status}`);
        } else if (error.request) {
            // Request was made but no response received
            console.error('[TU Auth] No response from TU Auth API:', error.message);
            throw new Error('TU Auth service is unavailable. Please try again later.');
        } else {
            // Something else went wrong
            console.error('[TU Auth] Request error:', error.message);
            throw new Error('Failed to connect to authentication service');
        }
    }
};

/**
 * Transform TU Auth response to our API format
 * @param {Object} tuResponse - Response from TU Auth API
 * @returns {Object} Normalized user object
 */
export const transformUserData = (tuResponse) => {
    const baseUser = {
        type: tuResponse.type,
        username: tuResponse.username,
        displayname_th: tuResponse.displayname_th,
        displayname_en: tuResponse.displayname_en,
        email: tuResponse.email,
        department: tuResponse.department,
    };

    // Add type-specific fields
    if (tuResponse.type === 'student') {
        return {
            ...baseUser,
            faculty: tuResponse.faculty,
            tu_status: tuResponse.tu_status,
            statusid: tuResponse.statusid,
        };
    } else if (tuResponse.type === 'employee') {
        return {
            ...baseUser,
            organization: tuResponse.organization,
            StatusWork: tuResponse.StatusWork,
            StatusEmp: tuResponse.StatusEmp,
        };
    }

    return baseUser;
};
