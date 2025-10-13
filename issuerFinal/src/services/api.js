// src/services/api.js

// YOUR BACKEND URL
const API_BASE_URL = 'http://172.16.10.117:5000';

/**
 * Fetch issuer information from backend
 */
export async function fetchIssuerInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/issuer-info`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching issuer info:', error);
    throw error;
  }
}

/**
 * Check blockchain connection health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

/**
 * Issue credential to holder (called after QR scan by mobile)
 * This is used internally by the mobile wallet when scanning QR
 */
export async function issueCredentialToHolder(holderDID, credentialData) {
  try {
    const response = await fetch(`${API_BASE_URL}/issue-to-holder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holderDID,
        credentialData,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error issuing credential:', error);
    throw error;
  }
}

export default {
  fetchIssuerInfo,
  checkHealth,
  issueCredentialToHolder,
};