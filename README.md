Full-Stack Applicant Tracking System (Node.js & MongoDB)
Project Summary:
Designed and deployed an internal Applicant Tracking System (ATS) to centralize candidate data, standardize recruitment life-cycles, and generate actionable HR metrics. This full-stack application replaces fragmented email and Excel processes with a secure, scalable web platform.
Backend & Database Engineering:
NoSQL Data Modeling: Designed flexible document schemas in MongoDB to handle diverse candidate profiles, job postings, and application records.
Database Optimization: Implemented text and compound indexing on frequently queried fields (skills, email, status) to ensure highly performant multi-criteria search capabilities.
Business Intelligence (KPIs): Leveraged MongoDB's Aggregation Pipeline to calculate real-time analytics, including application counts by status, average time-to-hire (delay), and the most effective candidate sourcing channels.
Data Reliability: Configured mongodump and mongorestore utilities to ensure safe database backups and data recovery.
Security & Architecture:
Role-Based Access Control (RBAC): Built a custom middleware system using JSON Web Tokens (JWT) to enforce strict access rules. The system distinguishes between:
Admins: User management.
Managers: Access to global KPIs and analytics.
Recruiters: Candidate processing and workflow updates.
Cryptographic Security: Secured user credentials using the bcryptjs library for password hashing prior to database insertion.
Audit Trailing: Engineered a state-machine workflow that tracks candidate transitions (e.g., Received $\rightarrow$ Interview $\rightarrow$ Hired). Every state change automatically pushes a timestamped log into the application's history array, ensuring 100% traceability of recruiter actions.
Frontend Implementation:
Dynamic UI: Developed a lightweight, responsive client-side interface using HTML5, CSS3, and Vanilla JavaScript to interact seamlessly with the Node.js REST API.
Future Roadmap:
Frontend Framework Integration: Migrating the Vanilla JS client to React.js or Vue.js for a more reactive user experience.
Automated Email Notifications: Integrating a service like SendGrid to automatically notify candidates when their application status changes.