/**
 * User Service
 * Business logic for user operations
 * Handles validation, transactions, and orchestration
 */

import * as userRepo from '../repositories/user.repository.js';

/**
 * Get all users with "Professor" role
 * @returns {Promise<Array>} - Array of professor users
 */
export async function getProfessors() {
    console.log('[User Service] 📚 Fetching all professors...');
    
    const professors = await userRepo.findUsersByRole('Professor');
    
    console.log('[User Service] ✅ Found', professors.length, 'professors');
    
    return professors;
}

/**
 * Get user by ID
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function getUserById(userId) {
    return await userRepo.findById(userId);
}
