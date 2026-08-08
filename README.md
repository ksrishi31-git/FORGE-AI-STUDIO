# ForgeAI Studio

## Autonomous Multi-Agent Software Engineering Platform

> ForgeAI Studio transforms a software idea into a structured development workflow using multiple specialized AI agents.

---

## Project Status

### Working Prototype — Core Workflow Implemented

ForgeAI Studio currently demonstrates a complete multi-agent software engineering workflow from requirements to final review.

### Currently Working

- User authentication and project creation
- Workspace for managing projects
- 10-agent software development workflow
- Shared project context between agents
- Architecture and database planning
- Backend and frontend planning
- QA and security validation
- Deployment and documentation generation
- Automated final review
- Retry and resume support
- Deterministic agent execution
- Optional LLM-powered execution
- Live agent progress and execution logs

### Current Prototype Result

```text
Pipeline  : Completed
Steps     : 10 / 10
Progress  : 100%
Review    : APPROVED

The current hackathon prototype is running locally. A working prototype demonstration video has been submitted. Public deployment is planned for the next stage.

Problem

Software development usually requires multiple stages such as:

Requirements
      ↓
Architecture
      ↓
Database Design
      ↓
Development
      ↓
Testing
      ↓
Security
      ↓
Deployment
      ↓
Documentation

Managing these stages manually can take significant time and effort.

ForgeAI Studio aims to automate and coordinate these stages using specialized AI agents.

Our Solution

ForgeAI Studio works like a virtual software engineering team.

Instead of using one AI for everything, the platform assigns different responsibilities to different agents.

The agents work together, share project information, generate outputs, review previous work, and move the project toward completion.


Workflow

User Idea
    ↓
Requirements
    ↓
Product Manager
    ↓
Solution Architect
    ↓
Database Architect
    ↓
Backend Engineer
    ↓
Frontend Engineer
    ↓
QA Engineer
    ↓
Security Auditor
    ↓
DevOps Engineer
    ↓
Technical Writer
    ↓
Reviewer
    ↓
Final Approval


Agent Roles

Agent	Main Responsibility
Product Manager	Converts the idea into clear requirements
Solution Architect	Designs the overall application structure
Database Architect	Plans the database structure
Backend Engineer	Plans backend APIs and services
Frontend Engineer	Plans the frontend structure
QA Engineer	Defines testing and quality checks
Security Auditor	Reviews security requirements and risks
DevOps Engineer	Plans deployment and infrastructure
Technical Writer	Generates technical documentation
Reviewer	Reviews the complete project and gives the final verdict

Key Features

Multi-Agent Development

Different agents handle different software engineering tasks.

Shared Project Context

Agents use requirements and outputs from previous stages to maintain consistency.

Artifact Generation

The system generates outputs for:

Architecture
Database
Backend
Frontend
QA
Security
Deployment
Documentation
Review
Automated Review

The final reviewer checks the generated project before approval.

Self-Correction

Review feedback can be sent back to the relevant stage for improvement.

Retry and Resume

Failed or interrupted workflows can continue from the appropriate stage.

Deterministic and LLM Modes

The system supports reliable deterministic execution and optional LLM-based execution when an API key is configured.

Technology Stack
Frontend
Next.js 15
React 19
TypeScript
Tailwind CSS
Backend
Python
FastAPI
SQLAlchemy
Alembic
Pydantic
AI and Agent Orchestration
LangGraph
LangChain
Deterministic Agent Engine
LLM Integration
Database and Memory
PostgreSQL
SQLite for local development
Redis
ChromaDB
Deployment
Docker
Vercel
Render

System Architecture

                 USER
                   │
                   ▼
          Next.js / React
              Frontend
                   │
                   ▼
             FastAPI API
                   │
                   ▼
          Agent Orchestration
             LangGraph
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Planning   Development  Review
        │          │          │
        └──────────┼──────────┘
                   ▼
            Shared Context
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Database           Memory
     PostgreSQL         ChromaDB
                           │
                         Redis

Authentication and Security
Backend-controlled authentication
Protected project access
Project-level authorization
Protected agent execution
Backend validation of user requests
Security checks during the agent workflow

The security boundary is handled by the backend rather than relying only on frontend controls.

Current Prototype

The working prototype currently demonstrates:

✓ Authentication
✓ Project Creation
✓ Workspace
✓ 10-Agent Pipeline
✓ Shared Project Context
✓ Artifact Generation
✓ QA Validation
✓ Security Review
✓ Deployment Planning
✓ Documentation
✓ Automated Review
✓ Approval Verdict
✓ Retry / Resume
✓ Live Agent Progress
✓ Deterministic Execution
✓ Optional LLM Integration

Example Workflow

A user can create a project such as:

Project:
SentinelAI

Requirement:
Autonomous software supply chain security platform.

The system processes the requirement through the agent pipeline and produces structured project artifacts.

Demo
Working Prototype

A working prototype demonstration video has been submitted for the hackathon.

The demo shows:

Project creation
Agent execution
Live pipeline progress
Agent completion
Generated artifacts
QA and security stages
Final review
Approval result

The current prototype is not publicly hosted yet and is being demonstrated locally.

Running the Project Locally
Prerequisites
Node.js
Python
Git
VS Code
Git Bash
Start Backend

Open the first terminal:

npm run dev:api

Backend:

http://localhost:8000
Start Frontend

Open a second terminal:

npm run dev:web

Frontend:

http://localhost:3000
API Documentation
http://localhost:8000/api/v1/docs
Workspace
http://localhost:3000/workspace

The current local prototype can run without Docker using the configured local development setup.

Project Structure
FORGE-AI-STUDIO/
│
├── frontend/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── database/
│   │
│   ├── alembic/
│   └── tests/
│
├── scripts/
├── docs/
└── package.json

Testing and Validation

The project includes backend tests and code-quality checks.

The complete agent workflow has been tested through the working prototype.

Verified Prototype Run
Agent Steps : 10 / 10
Progress    : 100%
Pipeline    : Completed
Review      : APPROVED
Research and References

The project is inspired by research and existing work in multi-agent software engineering and autonomous coding.

ChatDev — Multi-agent collaboration for software development
MetaGPT — Role-based multi-agent software development
AgentCoder — Code generation with testing and feedback
OpenHands — AI agents for software engineering tasks
Research Papers
ChatDev — Communicative Agents for Software Development
MetaGPT — Meta Programming for Multi-Agent Collaborative Framework
AgentCoder — Multi-Agent-Based Code Generation with Iterative Testing
Challenges

During development, we focused on:

Coordinating multiple agents
Maintaining project context between stages
Handling failures during the workflow
Keeping generated outputs consistent
Making autonomous actions safe and controllable
Future Scope
Public cloud deployment
More advanced LLM-driven development
Autonomous code generation
Automated UI testing
Improved security validation
CI/CD integration
Advanced deployment automation
Voice-driven software development
Improved production scalability
Team
PROMPT PILOTS

Domain: AI & Agentic AI

Team Members
Dhanvanth
Rishi Karthick
Thomas Edwin
Anbu Selvan

College
Dr. Mahalingam College of Engineering and Technology
