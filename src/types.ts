export interface User {
    uid: string;
    email: string;
    role: 'student' | 'staff' | 'admin';
    name: string;
}

export interface Grievance {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    subject: string;
    category: string;
    description: string;
    status: 'submitted' | 'in_progress' | 'resolved';
    attachmentUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    comments?: Comment[];
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: Date;
}

export type AuthContextType = {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, role: string) => Promise<void>;
    logout: () => Promise<void>;
};