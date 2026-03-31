import { Client, Employee, FilterChip, Notification, Task, User } from '@/types';

export const dummyUsers: User[] = [
  {
    id: '1',
    email: 'admin@office.com',
    role: 'Admin',
    name: 'Admin User',
  },
  {
    id: '2',
    email: 'manager@office.com',
    role: 'Manager',
    name: 'Manager User',
  },
  {
    id: '3',
    email: 'employee@office.com',
    role: 'Employee',
    name: 'Employee User',
  },
];

export const dummyTasks: Task[] = [
  {
    id: '1',
    assignedTo: '1',
    assignedToName: 'Divyansh Tiwari',
    category: 'Incorporation',
    title: 'Register Business entity',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
    status: 'pending',
    createdAt: '2025-11-30',
  },
  {
    id: '2',
    assignedTo: '2',
    assignedToName: 'Priya Sharma',
    category: 'HR',
    title: 'Review employee contracts',
    description: 'Check and update all employee contracts for the new quarter',
    status: 'pending',
    createdAt: '2025-11-29',
  },
  {
    id: '3',
    assignedTo: '3',
    assignedToName: 'Rahul Kumar',
    category: 'CFO',
    title: 'Prepare financial report',
    description: 'Compile Q4 financial statements and analysis',
    status: 'pending',
    createdAt: '2025-11-28',
  },
  {
    id: '4',
    assignedTo: '1',
    assignedToName: 'Amit Patel',
    category: 'Label',
    title: 'Update company policies',
    description: 'Review and update internal company policies documentation',
    status: 'completed',
    createdAt: '2025-11-27',
  },
  {
    id: '5',
    assignedTo: '2',
    assignedToName: 'Sneha Reddy',
    category: 'Incorporation',
    title: 'File annual returns',
    description: 'Submit annual returns to the registrar of companies',
    status: 'pending',
    createdAt: '2025-11-26',
  },
];

export const filterChips: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'incorporation', label: 'Incorporation' },
  { id: 'hr', label: 'HR' },
  { id: 'cfo', label: 'CFO' },
  { id: 'label', label: 'Label' },
];

export const dummyNotifications: Notification[] = [
    {
      id: '1',
      title: 'New Task Assigned',
      message: 'You have been assigned "Register Business entity"',
      type: 'task',
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      relatedTaskId: '1',
    },
    {
      id: '2',
      title: 'Task Completed',
      message: 'Amit Patel completed "Update company policies"',
      type: 'task',
      isRead: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
    {
      id: '3',
      title: 'Meeting Reminder',
      message: 'Team meeting scheduled at 3:00 PM today',
      type: 'reminder',
      isRead: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    },
    {
      id: '4',
      title: 'System Announcement',
      message: 'System maintenance scheduled for this weekend',
      type: 'announcement',
      isRead: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    },
    {
      id: '5',
      title: 'Deadline Alert',
      message: 'Task "File annual returns" is due tomorrow',
      type: 'alert',
      isRead: false,
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
    },
    {
      id: '6',
      title: 'New Comment',
      message: 'Priya Sharma commented on "Review employee contracts"',
      type: 'task',
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      id: '7',
      title: 'Task Reassigned',
      message: 'Task "Prepare financial report" has been reassigned to you',
      type: 'task',
      isRead: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    },
    {
      id: '8',
      title: 'Policy Update',
      message: 'New work from home policy has been published',
      type: 'announcement',
      isRead: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    },
    {
      id: '9',
      title: 'Performance Review',
      message: 'Your quarterly performance review is ready',
      type: 'reminder',
      isRead: true,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
    },
    {
      id: '10',
      title: 'Team Achievement',
      message: 'Congratulations! Team completed 50 tasks this month',
      type: 'announcement',
      isRead: true,
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(), // 1 month+ ago
    },
  ];


  export const dummyEmployees: Employee[] = [
    {
      id: '1',
      name: 'Divyansh Tiwari',
      email: 'divyansh@office.com',
      role: 'Employee',
      department: 'Incorporation',
      phone: '+91 98765 43210',
      joinDate: '2024-01-15',
      status: 'active',
      tasksCompleted: 45,
      tasksAssigned: 12,
    },
    {
      id: '2',
      name: 'Priya Sharma',
      email: 'priya@office.com',
      role: 'Manager',
      department: 'HR',
      phone: '+91 98765 43211',
      joinDate: '2023-06-20',
      status: 'active',
      tasksCompleted: 128,
      tasksAssigned: 8,
    },
    {
      id: '3',
      name: 'Rahul Kumar',
      email: 'rahul@office.com',
      role: 'Employee',
      department: 'CFO',
      phone: '+91 98765 43212',
      joinDate: '2024-03-10',
      status: 'active',
      tasksCompleted: 67,
      tasksAssigned: 15,
    },
    {
      id: '4',
      name: 'Amit Patel',
      email: 'amit@office.com',
      role: 'Employee',
      department: 'Legal',
      phone: '+91 98765 43213',
      joinDate: '2023-11-05',
      status: 'active',
      tasksCompleted: 92,
      tasksAssigned: 6,
    },
    {
      id: '5',
      name: 'Sneha Reddy',
      email: 'sneha@office.com',
      role: 'Employee',
      department: 'Incorporation',
      phone: '+91 98765 43214',
      joinDate: '2024-02-18',
      status: 'inactive',
      tasksCompleted: 34,
      tasksAssigned: 3,
    },
  ];
  
  export const dummyClients: Client[] = [
    {
      id: '1',
      name: 'Rajesh Gupta',
      company: 'Tech Solutions Pvt Ltd',
      email: 'rajesh@techsolutions.com',
      phone: '+91 98765 11111',
      status: 'active',
      projectType: 'Company Incorporation',
      joinDate: '2024-01-10',
      totalProjects: 3,
    },
    {
      id: '2',
      name: 'Meera Singh',
      company: 'Digital Ventures Inc',
      email: 'meera@digitalventures.com',
      phone: '+91 98765 22222',
      status: 'active',
      projectType: 'Tax Consultation',
      joinDate: '2024-03-15',
      totalProjects: 5,
    },
    {
      id: '3',
      name: 'Arjun Malhotra',
      company: 'Startup Hub',
      email: 'arjun@startuphub.com',
      phone: '+91 98765 33333',
      status: 'active',
      projectType: 'Business Registration',
      joinDate: '2024-02-20',
      totalProjects: 2,
    },
    {
      id: '4',
      name: 'Kavita Desai',
      company: 'Finance Pro',
      email: 'kavita@financepro.com',
      phone: '+91 98765 44444',
      status: 'inactive',
      projectType: 'Annual Compliance',
      joinDate: '2023-12-05',
      totalProjects: 8,
    },
    {
      id: '5',
      name: 'Vikram Rao',
      company: 'Global Traders',
      email: 'vikram@globaltraders.com',
      phone: '+91 98765 55555',
      status: 'active',
      projectType: 'Import/Export License',
      joinDate: '2024-04-01',
      totalProjects: 1,
    },
  ];