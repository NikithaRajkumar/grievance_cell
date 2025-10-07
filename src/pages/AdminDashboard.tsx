import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    TextField,
    Alert,
    Grid,
    CircularProgress,
    Tab,
    Tabs,
    CardContent,
    Card,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    AttachFile as AttachFileIcon,
    Send as SendIcon
} from '@mui/icons-material';
import { db, auth } from '../services/firebase';
import {
    collection,
    query,
    onSnapshot,
    doc,
    updateDoc,
    where,
    getDocs,
    orderBy,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { Grievance, User, Comment } from '../types';

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

const AdminDashboard = () => {
    const [grievances, setGrievances] = useState<Grievance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!auth.currentUser) {
                navigate('/login');
                return;
            }

            try {
                const userDoc = await getDocs(
                    query(collection(db, 'users'), where('uid', '==', auth.currentUser.uid))
                );

                if (!userDoc.empty) {
                    const userData = userDoc.docs[0].data() as User;
                    setCurrentUser(userData);
                    if (userData.role !== 'admin') {
                        navigate('/dashboard');
                    } else {
                        setIsAdmin(true);
                    }
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                setError('Failed to verify admin privileges');
            }
        };

        checkAdminStatus();
    }, [navigate]);

    useEffect(() => {
        if (!isAdmin) return;

        const q = query(
            collection(db, 'grievances'),
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
                setError('Failed to load grievances');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [isAdmin]);

    const handleStatusChange = async (grievanceId: string, newStatus: string) => {
        if (!currentUser) return;

        try {
            const grievance = grievances.find(g => g.id === grievanceId);
            if (!grievance) return;

            const statusComment: Comment = {
                id: Date.now().toString(),
                userId: currentUser.uid,
                userName: currentUser.name,
                content: `Status updated to ${statusLabels[newStatus]}`,
                timestamp: new Date()
            };

            await updateDoc(doc(db, 'grievances', grievanceId), {
                status: newStatus,
                updatedAt: new Date(),
                comments: [...(grievance.comments || []), statusComment]
            });
        } catch (error) {
            console.error('Error updating status:', error);
            setError('Failed to update grievance status');
        }
    };

    const handleAddComment = async () => {
        if (!selectedGrievance || !currentUser || !newComment.trim()) return;

        try {
            const comment: Comment = {
                id: Date.now().toString(),
                userId: currentUser.uid,
                userName: currentUser.name,
                content: newComment.trim(),
                timestamp: new Date()
            };

            await updateDoc(doc(db, 'grievances', selectedGrievance.id), {
                comments: [...(selectedGrievance.comments || []), comment],
                updatedAt: new Date()
            });

            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
            setError('Failed to add comment');
        }
    };

    if (!isAdmin) return null;

    const filteredGrievances = grievances.filter(grievance => {
        const matchesSearch = searchTerm === '' ||
            grievance.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesCategory = categoryFilter === 'all' || grievance.category === categoryFilter;
        
        const matchesStatus = tabValue === 0 || 
            (tabValue === 1 && grievance.status === 'submitted') ||
            (tabValue === 2 && grievance.status === 'in_progress') ||
            (tabValue === 3 && grievance.status === 'resolved');
            
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" color="primary">
                    Admin Dashboard
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
                </Box>
            </Box>

            {/* Search and Filter */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="Search grievances..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Filter by Category</InputLabel>
                            <Select
                                value={categoryFilter}
                                label="Filter by Category"
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Categories</MenuItem>
                                <MenuItem value="Academic">Academic</MenuItem>
                                <MenuItem value="Administrative">Administrative</MenuItem>
                                <MenuItem value="Infrastructure">Infrastructure</MenuItem>
                                <MenuItem value="Hostel">Hostel</MenuItem>
                                <MenuItem value="Canteen">Canteen</MenuItem>
                                <MenuItem value="Transportation">Transportation</MenuItem>
                                <MenuItem value="Laboratory">Laboratory</MenuItem>
                                <MenuItem value="Library">Library</MenuItem>
                                <MenuItem value="Sports Facilities">Sports Facilities</MenuItem>
                                <MenuItem value="Others">Others</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

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
                    onChange={(e, newValue) => setTabValue(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label={`All (${grievances.length})`} />
                    <Tab label={`New (${grievances.filter(g => g.status === 'submitted').length})`} />
                    <Tab label={`In Progress (${grievances.filter(g => g.status === 'in_progress').length})`} />
                    <Tab label={`Resolved (${grievances.filter(g => g.status === 'resolved').length})`} />
                </Tabs>

                <TabPanel value={tabValue} index={tabValue}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredGrievances.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="textSecondary">
                                No grievances found
                            </Typography>
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
                                        onClick={() => {
                                            setSelectedGrievance(grievance);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h6" gutterBottom>
                                                        {grievance.subject}
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                                        From: {grievance.userEmail} | Category: {grievance.category}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={statusLabels[grievance.status]}
                                                    color={statusColors[grievance.status]}
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
                                                    Submitted: {grievance.createdAt.toLocaleDateString()}
                                                    {grievance.createdAt.toLocaleDateString() !== grievance.updatedAt.toLocaleDateString() && 
                                                        ` | Updated: ${grievance.updatedAt.toLocaleDateString()}`
                                                    }
                                                </Typography>
                                                <Box>
                                                    {grievance.attachmentUrl && (
                                                        <Tooltip title="Has attachment">
                                                            <IconButton size="small">
                                                                <AttachFileIcon fontSize="small" />
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6">{selectedGrievance.subject}</Typography>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <Select
                                        value={selectedGrievance.status}
                                        onChange={(e) => handleStatusChange(selectedGrievance.id, e.target.value)}
                                    >
                                        <MenuItem value="submitted">Submitted</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                        <MenuItem value="resolved">Resolved</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Submitted by: {selectedGrievance.userEmail}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Category: {selectedGrievance.category}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                        Submitted on: {selectedGrievance.createdAt.toLocaleString()}
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ my: 3 }}>
                                <Typography variant="body1" paragraph>
                                    {selectedGrievance.description}
                                </Typography>
                            </Box>

                            {selectedGrievance.attachmentUrl && (
                                <Button
                                    variant="outlined"
                                    startIcon={<AttachFileIcon />}
                                    href={selectedGrievance.attachmentUrl}
                                    target="_blank"
                                    sx={{ mb: 3 }}
                                >
                                    View Attachment
                                </Button>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {/* Comments Section */}
                            <Typography variant="h6" gutterBottom>
                                Comments
                            </Typography>
                            <List>
                                {selectedGrievance.comments?.map((comment, index) => (
                                    <ListItem key={index} divider>
                                        <ListItemText
                                            primary={comment.content}
                                            secondary={`${comment.userName} - ${new Date(comment.timestamp).toLocaleString()}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>

                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    multiline
                                    rows={2}
                                />
                                <Button
                                    variant="contained"
                                    endIcon={<SendIcon />}
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                >
                                    Send
                                </Button>
                            </Box>
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

export default AdminDashboard;

function setFilter(value: any): void {
  throw new Error('Function not implemented.');
}
