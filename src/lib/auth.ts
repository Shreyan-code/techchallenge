import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

export const resetPassword = async (email: string) => {
  const auth = getAuth();
  
  try {
    await sendPasswordResetEmail(auth, email, {
      url: 'https://stuf-blush.vercel.app/login', // Redirect after reset
      handleCodeInApp: false,
    });
    return { success: true, message: 'Password reset email sent!' };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send reset email' 
    };
  }
};
