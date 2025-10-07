import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    MenuItem,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    SelectChangeEvent
} from '@mui/material';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<{ name?: string; value: unknown }> | SelectChangeEvent<string>
    ) => {
        const name = e.target.name;
        const value = e.target.value;
        if (name) {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            // Clear error when user starts typing
            if (error) setError('');
        }
    };

    const validateForm = () => {
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) return;
        
        setLoading(true);

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            setLoading(false);
            setError('Registration timed out. Please try again.');
        }, 15000); // 15 seconds timeout

        try {
            // Check if Firebase Auth is initialized
            if (!auth) {
                throw new Error('Firebase Authentication is not initialized');
            }

            // Check if Firestore is initialized
            if (!db) {
                throw new Error('Firestore is not initialized');
            }

            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // Create user document in Firestore
            const userData = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                uid: userCredential.user.uid,
                createdAt: new Date().toISOString()
            };

            // Set the user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), userData);

            // Clear timeout since operation was successful
            clearTimeout(timeoutId);

            // Navigate to submit grievance page
            navigate('/submit-grievance', { state: { message: 'Registration successful!' } });
        } catch (error: any) {
            console.error('Registration error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'auth/email-already-in-use') {
                setError('This email is already registered');
            } else if (error.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (error.code === 'auth/weak-password') {
                setError('Password is too weak. It must be at least 6 characters long');
            } else if (error.code === 'auth/network-request-failed') {
                setError('Network error. Please check your internet connection');
            } else {
                setError(`Registration failed: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px)',
                bgcolor: '#f5f5f5',
                p: 2
            }}
        >
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    width: '100%', 
                    maxWidth: 400,
                    borderRadius: 2
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Create an Account
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                    Join the Grievance Cell Portal
                </Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                        helperText="Password must be at least 6 characters long"
                    />
                    <TextField
                        fullWidth
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="role-label">Role</InputLabel>
                        <Select
                            labelId="role-label"
                            name="role"
                            value={formData.role}
                            label="Role"
                            onChange={handleChange}
                            required
                            disabled={loading}
                        >
                            <MenuItem value="student">Student</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{ 
                            mt: 3, 
                            mb: 2,
                            height: 46,
                            bgcolor: '#1976d2',
                            '&:hover': {
                                bgcolor: '#115293'
                            }
                        }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Register'}
                    </Button>
                    
                    <Button
                        fullWidth
                        variant="text"
                        onClick={() => navigate('/login')}
                        disabled={loading}
                        sx={{ textTransform: 'none' }}
                    >
                        Already have an account? Login
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};

export default Register;
