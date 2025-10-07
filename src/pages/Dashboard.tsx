import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Button,
    Tab,
    Tabs,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    useTheme,
    Tooltip,
    Card,
    CardContent,
    Grid,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    AttachFile as AttachFileIcon,
    Comment as CommentIcon
} from '@mui/icons-material';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Grievance } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

const statusColors: Record<string, 'warning' | 'info' | 'success'> = {
    submitted: 'warning',
    in_progress: 'info',
    resolved: 'success',
};

const statusLabels: Record<string, string> = {
    submitted: 'Submitted',
    in_progress: 'In Progress',
    resolved: 'Resolved'
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const Dashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [grievances, setGrievances] = useState<Grievance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const q = query(
            collection(db, 'grievances'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        setLoading(true);
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const grievanceList: Grievance[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    grievanceList.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt.toDate(),
                        updatedAt: data.updatedAt.toDate()
                    } as Grievance);
                });
                setGrievances(grievanceList);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching grievances:', err);
                setError('Failed to load grievances. Please refresh the page.');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, navigate]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const openGrievanceDialog = (grievance: Grievance) => {
        setSelectedGrievance(grievance);
        setDialogOpen(true);
    };

    const filteredGrievances = grievances.filter(grievance => {
        if (tabValue === 0) return true; // All
        if (tabValue === 1) return grievance.status === 'submitted';
        if (tabValue === 2) return grievance.status === 'in_progress';
        if (tabValue === 3) return grievance.status === 'resolved';
        return true;
    });

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" color="primary">
                    My Grievances
                </Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => setLoading(true)}
                        sx={{ mr: 2 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/submit-grievance')}
                    >
                        New Grievance
                    </Button>
                </Box>
            </Box>

            {/* Success Message */}
            {successMessage && (
                <Alert 
                    severity="success" 
                    onClose={() => setSuccessMessage('')}
                    sx={{ mb: 3 }}
                >
                    {successMessage}
                </Alert>
            )}

            {/* Error Message */}
            {error && (
                <Alert 
                    severity="error" 
                    onClose={() => setError('')}
                    sx={{ mb: 3 }}
                >
                    {error}
                </Alert>
            )}

            {/* Main Content */}
            <Paper elevation={3} sx={{ borderRadius: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="All" />
                    <Tab label="Pending" />
                    <Tab label="In Progress" />
                    <Tab label="Resolved" />
                </Tabs>

                <TabPanel value={tabValue} index={tabValue}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredGrievances.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="textSecondary">
                                No grievances found in this category
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/submit-grievance')}
                                sx={{ mt: 2 }}
                            >
                                Submit New Grievance
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={3} sx={{ p: 2 }}>
                            {filteredGrievances.map((grievance) => (
                                <Grid item xs={12} key={grievance.id}>
                                    <Card 
                                        sx={{ 
                                            '&:hover': { 
                                                boxShadow: 6,
                                                cursor: 'pointer'
                                            }
                                        }}
                                        onClick={() => openGrievanceDialog(grievance)}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h6" gutterBottom>
                                                        {grievance.subject}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                                        Category: {grievance.category}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={statusLabels[grievance.status]}
                                                    color={statusColors[grievance.status]}
                                                    size="small"
                                                />
                                            </Box>
                                            
                                            <Typography 
                                                variant="body1" 
                                                sx={{ 
                                                    mb: 2,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {grievance.description}
                                            </Typography>

                                            <Divider sx={{ my: 2 }} />

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="caption" color="textSecondary">
                                                    Submitted on: {grievance.createdAt.toLocaleDateString()}
                                                </Typography>
                                                <Box>
                                                    {grievance.attachmentUrl && (
                                                        <Tooltip title="Has attachment">
                                                            <IconButton size="small">
                                                                <AttachFileIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {grievance.comments && grievance.comments.length > 0 && (
                                                        <Tooltip title={`${grievance.comments.length} comments`}>
                                                            <IconButton size="small">
                                                                <CommentIcon fontSize="small" />
                                                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                                                    {grievance.comments.length}
                                                                </Typography>
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </TabPanel>
            </Paper>

            {/* Grievance Detail Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedGrievance && (
                    <>
                        <DialogTitle>
                            <Typography variant="h6">{selectedGrievance.subject}</Typography>
                            <Chip
                                label={statusLabels[selectedGrievance.status]}
                                color={statusColors[selectedGrievance.status]}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </DialogTitle>
                        <DialogContent dividers>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Category: {selectedGrievance.category}
                            </Typography>
                            <Typography variant="body1" paragraph>
                                {selectedGrievance.description}
                            </Typography>
                            {selectedGrievance.attachmentUrl && (
                                <Button
                                    variant="outlined"
                                    startIcon={<AttachFileIcon />}
                                    href={selectedGrievance.attachmentUrl}
                                    target="_blank"
                                    sx={{ mt: 2 }}
                                >
                                    View Attachment
                                </Button>
                            )}
                            {selectedGrievance.comments && selectedGrievance.comments.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Comments
                                    </Typography>
                                    <List>
                                        {selectedGrievance.comments.map((comment, index) => (
                                            <ListItem key={index} divider>
                                                <ListItemText
                                                    primary={comment.content}
                                                    secondary={`${comment.userName} - ${new Date(comment.timestamp).toLocaleDateString()}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default Dashboard;