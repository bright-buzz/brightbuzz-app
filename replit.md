# NewsFlow - AI-Curated News Platform

## Overview

NewsFlow is an AI-powered news curation platform designed specifically for young professionals to reduce information anxiety. The application intelligently filters and curates news content based on sentiment analysis and user-defined keywords, presenting only positive, career-focused content while filtering out anxiety-inducing topics like layoffs and economic downturns.

The platform features real-time news fetching from external APIs, AI-powered sentiment analysis using OpenAI's GPT-4o model, customizable keyword filtering, and a modern React-based interface with curated feeds and trending articles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for articles, keywords, and user preferences
- **Error Handling**: Centralized error middleware with structured error responses
- **Logging**: Custom request logging middleware for API monitoring

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management
- **In-Memory Fallback**: MemStorage class providing complete storage interface for development/testing

### Database Schema Design
- **Articles Table**: Stores news content with sentiment scores, keywords, view counts, and curation flags
- **Keywords Table**: Manages blocked and prioritized keywords for content filtering
- **User Preferences Table**: Stores sentiment threshold and real-time filtering settings

### AI Integration Architecture
- **Sentiment Analysis**: OpenAI GPT-4o model analyzes article sentiment with confidence scoring
- **Content Summarization**: AI-generated summaries optimized for professional audiences
- **Keyword Extraction**: Automatic keyword identification for content categorization
- **Content Curation**: AI-driven article selection based on positivity and professional relevance

### External Dependencies
- **News Data**: NewsAPI.org for real-time news content across multiple professional topics
- **AI Services**: OpenAI API for sentiment analysis, summarization, and content curation
- **Database**: Neon Database for serverless PostgreSQL hosting
- **UI Components**: Radix UI primitives for accessible component foundations
- **Styling**: Tailwind CSS for utility-first styling approach

### Content Filtering Strategy
The application implements a multi-layered filtering approach:
- **Sentiment Threshold**: Articles below user-defined sentiment scores are filtered out
- **Keyword Blocking**: Negative terms like "layoffs" and "recession" are automatically blocked
- **Keyword Prioritization**: Positive terms like "innovation" and "growth" are promoted
- **Real-Time Processing**: Content filtering occurs during news fetching and display

### Curation Algorithm
- **Top Five Selection**: Algorithm identifies trending articles based on views and sentiment
- **Featured Content**: AI selects representative articles for highlighted display
- **Personalization**: User preferences influence content selection and ranking
- **Freshness Balance**: System balances recent content with high-quality older articles