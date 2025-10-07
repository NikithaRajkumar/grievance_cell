export const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        // Auth errors
        case 'auth/email-already-in-use':
            return 'This email is already registered';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Invalid email or password';
        case 'auth/too-many-requests':
            return 'Too many unsuccessful login attempts. Please try again later';
        
        // Storage errors
        case 'storage/unauthorized':
            return 'You do not have permission to access this file';
        case 'storage/canceled':
            return 'Upload was cancelled';
        case 'storage/unknown':
            return 'An unknown error occurred during file upload';
        
        // Firestore errors
        case 'permission-denied':
            return 'You do not have permission to perform this action';
        case 'not-found':
            return 'The requested resource was not found';
        case 'already-exists':
            return 'The document already exists';
        case 'failed-precondition':
            return 'Operation was rejected';
        case 'unimplemented':
            return 'Operation is not implemented';
        case 'unavailable':
            return 'Service is currently unavailable. Please try again later';
        
        // Default error
        default:
            return 'An error occurred. Please try again';
    }
};

export const handleFirebaseError = (error: any): string => {
    if (error.code) {
        return getFirebaseErrorMessage(error.code);
    }
    return error.message || 'An unexpected error occurred';
};