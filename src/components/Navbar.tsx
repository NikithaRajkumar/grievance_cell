import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/firebase';
import { User } from '../types';

interface NavbarProps {
    currentUser: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Grievance Cell
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {currentUser ? (
                        <>
                            <Button color="inherit" onClick={() => navigate('/submit-grievance')}>
                                Submit Grievance
                            </Button>
                            <Button color="inherit" onClick={() => navigate('/dashboard')}>
                                My Grievances
                            </Button>
                            {currentUser.role === 'admin' && (
                                <Button color="inherit" onClick={() => navigate('/admin')}>
                                    Admin Panel
                                </Button>
                            )}
                            <Button color="inherit" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button color="inherit" onClick={() => navigate('/login')}>
                                Login
                            </Button>
                            <Button color="inherit" onClick={() => navigate('/register')}>
                                Register
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;