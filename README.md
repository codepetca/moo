# 🎓 Convex Autograding System

An enterprise-grade autograding system with Google Classroom integration, built on the Convex serverless platform.

## ✨ Features

- **🤖 Advanced Autograding**: Multiple algorithms for different question types (multiple choice, short answer, essays)
- **🧠 AI-Powered Grading**: Integration with OpenAI and Anthropic for intelligent essay grading
- **📊 Real-time Analytics**: Comprehensive dashboard with performance insights
- **🔄 Batch Processing**: Concurrent grading with configurable limits
- **📤 Multi-format Export**: CSV, JSON, and Google Classroom compatible exports
- **🎯 Google Classroom Integration**: Seamless grade synchronization
- **⚡ Serverless Architecture**: Built on Convex for scalability and real-time updates

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Convex account ([sign up free](https://convex.dev))
- Google Cloud Project with Classroom API enabled

### Installation

```bash
git clone <your-repository-url>
cd convex-autograding-system
npm install
```

### Setup

1. **Initialize Convex**:
   ```bash
   npx convex dev
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access Dashboard**:
   Open `http://localhost:5174`

## 🏗️ Architecture

- **Frontend**: React + TypeScript dashboard
- **Backend**: Convex serverless functions with real-time sync
- **Database**: Convex database with automatic indexing
- **Integration**: Google Apps Script for Classroom API

## 📋 System Components

### Core Functions
- Assignment creation and management
- Submission processing and storage
- Advanced grading engine with multiple algorithms
- Batch processing for large datasets
- AI-powered essay grading
- Grade export and synchronization

### Grading Algorithms
- **Multiple Choice**: Exact matching with confidence scoring
- **Short Answer**: Text similarity and numeric tolerance
- **Essay Questions**: AI-powered analysis with rubric support
- **Checkbox**: Partial credit for multi-select questions

### Analytics & Reporting
- Real-time dashboard summaries
- Student performance tracking
- Class statistics and insights
- Comprehensive export options

## 🧪 Testing

The system includes comprehensive integration tests:

```bash
# Run through Convex dashboard or programmatically
ctx.runAction("integrationTests:runIntegrationTests", {
  testMode: true,
  testCourseId: "test-course-123"
})
```

## 📚 Documentation

- **Deployment Guide**: See `DEPLOYMENT_GUIDE.md` for detailed setup
- **API Reference**: All Convex functions documented with TypeScript
- **Google Apps Script**: Integration code in `appscript/Code.gs`

## 🔧 Development

### Project Structure
```
├── src/                    # React frontend
├── convex/                 # Serverless functions
│   ├── autograding.ts     # Core grading logic
│   ├── gradingEngine.ts   # Advanced algorithms
│   ├── aiGrading.ts       # AI integration
│   └── schema.ts          # Database schema
├── appscript/             # Google Apps Script
└── DEPLOYMENT_GUIDE.md    # Setup instructions
```

### Available Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run dev:frontend` - Frontend only
- `npm run dev:backend` - Backend only

## 📈 Production Ready

- ✅ **20+ Convex functions** deployed and tested
- ✅ **Enterprise-grade error handling** with retry logic
- ✅ **Scalable batch processing** for large datasets
- ✅ **Comprehensive validation** and data integrity
- ✅ **User isolation** and security measures
- ✅ **Real-time updates** and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the integration tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues, questions, or contributions:
- Check the deployment guide for setup help
- Review the integration tests for usage examples
- Open an issue for bugs or feature requests

---

Built with ❤️ using [Convex](https://convex.dev) - the fullstack TypeScript platform
