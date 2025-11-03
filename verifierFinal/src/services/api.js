// verifier-frontend/src/services/api.js

const API_BASE_URL = 'https://icbhyhmetd.execute-api.ap-south-1.amazonaws.com/';

/**
 * Get verifier information
 */
export async function fetchVerifierInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/verifier/info`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching verifier info:', error);
    throw error;
  }
}

/**
 * Create verification request (generate session)
 */
export async function createVerificationRequest(requestedCredentials, verifierName, purpose) {
  try {
    const response = await fetch(`${API_BASE_URL}/verifier/create-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestedCredentials,
        verifierName,
        purpose
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating verification request:', error);
    throw error;
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/verifier/session/${sessionId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting session status:', error);
    throw error;
  }
}

/**
 * Verify presentation
 */
export async function verifyPresentation(vpJwt, challenge) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-vp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vpJwt,
        challenge: challenge || undefined
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying presentation:', error);
    throw error;
  }
}

/**
 * Check backend health
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

export default {
  fetchVerifierInfo,
  createVerificationRequest,
  getSessionStatus,
  verifyPresentation,
  checkHealth,
};