import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Snackbar
} from '@mui/material';
import { loginUser } from '../services/firebase';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await loginUser(email, password);
            console.log('Login success, navigating...');
            setSuccessOpen(true);
            // Navigate to submit grievance page after showing success message
            setTimeout(() => {
                navigate('/submit-grievance');
                console.log('Navigated to /submit-grievance');
            }, 1500);
        } catch (error: any) {
            setError('Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSuccess = () => {
        setSuccessOpen(false);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px)',
                bgcolor: '#f5f5f5'
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
                    Welcome to Grievance Cell
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                    Please login to continue
                </Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        disabled={loading}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        disabled={loading}
                        sx={{ mb: 3 }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{ 
                            mt: 1, 
                            mb: 2,
                            height: 46,
                            bgcolor: '#1976d2',
                            '&:hover': {
                                bgcolor: '#115293'
                            }
                        }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Login'}
                    </Button>
                    <Button
                        fullWidth
                        variant="text"
                        onClick={() => navigate('/register')}
                        disabled={loading}
                        sx={{ textTransform: 'none' }}
                    >
                        Don't have an account? Register
                    </Button>
                </form>
            </Paper>
            
            <Snackbar
                open={successOpen}
                autoHideDuration={1500}
                onClose={handleCloseSuccess}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
                    Login successful! Redirecting...
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Login;
