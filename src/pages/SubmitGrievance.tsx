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
    SelectChangeEvent,
    IconButton,
    Chip
} from '@mui/material';
import { AttachFile as AttachFileIcon, Clear as ClearIcon } from '@mui/icons-material';
import { db, auth, storage } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const categories = [
    'Academic',
    'Administrative',
    'Infrastructure',
    'Hostel',
    'Canteen',
    'Transportation',
    'Laboratory',
    'Library',
    'Sports Facilities',
    'Others'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        category: '',
        subject: '',
        description: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateFile = (file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File size should not exceed 5MB');
        }
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            throw new Error('Only JPG, PNG, PDF and DOC files are allowed');
        }
    };

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
            if (error) setError('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            try {
                validateFile(selectedFile);
                setFile(selectedFile);
                setError('');
            } catch (err: any) {
                setError(err.message);
                e.target.value = '';
            }
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            navigate('/login');
            return;
        }

        if (!formData.category || !formData.subject || !formData.description.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            let attachmentUrl = '';
            if (file) {
                const storageRef = ref(
                    storage, 
                    `attachments/${auth.currentUser.uid}/${Date.now()}_${file.name}`
                );
                const snapshot = await uploadBytes(storageRef, file);
                attachmentUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, 'grievances'), {
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                userName: auth.currentUser.displayName,
                category: formData.category,
                subject: formData.subject,
                description: formData.description,
                status: 'submitted',
                createdAt: new Date(),
                updatedAt: new Date(),
                attachmentUrl,
                comments: []
            });

            navigate('/dashboard', { state: { message: 'Grievance submitted successfully!' } });
        } catch (error: any) {
            setError('Failed to submit grievance. Please try again.');
            console.error('Submit error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                minHeight: 'calc(100vh - 64px)',
                bgcolor: '#f5f5f5',
                p: 3
            }}
        >
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    width: '100%', 
                    maxWidth: 800,
                    borderRadius: 2,
                    mb: 3
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center" color="primary">
                    Submit New Grievance
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 4 }}>
                    Please provide details about your concern
                </Typography>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 3 }}
                        onClose={() => setError('')}
                    >
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="category-label">Category *</InputLabel>
                        <Select
                            labelId="category-label"
                            name="category"
                            value={formData.category}
                            label="Category *"
                            onChange={handleChange}
                            required
                            disabled={loading}
                        >
                            {categories.map((category) => (
                                <MenuItem key={category} value={category}>
                                    {category}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Subject *"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                        placeholder="Brief title of your grievance"
                    />

                    <TextField
                        fullWidth
                        label="Description *"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                        multiline
                        rows={6}
                        placeholder="Please provide detailed information about your grievance"
                    />

                    <Box sx={{ mt: 2, mb: 3 }}>
                        <input
                            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            id="attachment-file"
                            type="file"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                        <label htmlFor="attachment-file">
                            <Button
                                component="span"
                                variant="outlined"
                                startIcon={<AttachFileIcon />}
                                disabled={loading || !!file}
                                sx={{ mr: 2 }}
                            >
                                Attach File
                            </Button>
                        </label>
                        {file && (
                            <Chip
                                label={file.name}
                                onDelete={handleRemoveFile}
                                deleteIcon={<ClearIcon />}
                                variant="outlined"
                            />
                        )}
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                            Accepted formats: JPG, PNG, PDF, DOC (Max size: 5MB)
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ 
                                py: 1.5,
                                bgcolor: '#1976d2',
                                '&:hover': {
                                    bgcolor: '#115293'
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Submit Grievance'
                            )}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default SubmitGrievance;