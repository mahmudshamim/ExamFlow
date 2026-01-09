# 🌊 ExamFlow - Corporate Assessment & Certification System

ExamFlow is a premium, full-stack corporate assessment platform designed to streamline the process of creating, managing, and evaluating exams. Built with a modern tech stack, it offers a high-performance, secure, and visually stunning experience for both administrators and candidates.

![ExamFlow Banner](https://via.placeholder.com/1200x400?text=ExamFlow+Assessment+System)

## 🚀 Key Features

### 👨‍💼 Administrator Suite
- **Interactive Dashboard**: Real-time analytics on student performance and exam statistics.
- **Advanced Exam Builder**: Create complex assessments with Multiple Choice (MCQ) and Short Answer questions.
- **Bulk Result Management**: Send scores to hundreds of candidates instantly with one click.
- **Automated Certification**: Integrated notification system for immediate feedback.

### 📝 Candidate Experience
- **Premium UI/UX**: High-end minimalist design with glassmorphism and smooth animations (Framer Motion).
- **Secure Assessments**: Integrated anti-cheat measures (clipboard protection) and browser focus tracking.
- **Timed Evaluations**: Precision timers with auto-submission and final-minute warnings.
- **Instant Results**: Immediate score calculation and email delivery for MCQ-only exams.

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **Styling**: Tailwind CSS 4 (Custom Design Tokens)
- **Animations**: Framer Motion
- **State/API**: Axios & React Hooks
- **Icons**: Lucide React
- **Notifications**: SweetAlert2

### Backend
- **Core**: Node.js & Express 5.2
- **Database**: MongoDB (Mongoose 9)
- **Security**: JWT Authentication & Bcryptjs
- **Emails**: Nodemailer (GMAIL Integration)
- **PDF**: PDFKit
- **File Stores**: Multer

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Gmail App Password (for email delivery)

### 1. Clone the project
```bash
git clone https://github.com/mahmudshamim/ExamFlow.git
cd ExamFlow
```

### 2. Install Dependencies
```bash
# From the root directory
cd client && npm install
cd ../server && npm install
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```env
MONGODB_URI=your_mongodb_uri
PORT=5000
JWT_SECRET=your_jwt_secret
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
HR_EMAIL=hr_notification@yourdomain.com
```

### 4. Run Locally
```bash
# Run both frontend and backend from the root
npm run dev
```

## 🔒 Security Measures
- **Rate Limiting**: Protection against brute force on auth routes.
- **Sanitized Inputs**: MongoDB injection protection via Mongoose.
- **Secure Sessions**: HTTP-Only cookies and JWT for stateful authentication.
- **Data Privacy**: Credential scrubbing in Git using specific `.gitignore` rules.

## 📄 License
Balanced for corporate use. © 2025 ExamFlow.

---
*Built with ❤️ for performance and aesthetics.*
