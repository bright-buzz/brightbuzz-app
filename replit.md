# NewsFlow - AI-Curated News Platform

## Overview

NewsFlow is an AI-powered news curation platform designed specifically for young professionals to reduce information anxiety. The application intelligently filters and curates news content based on sentiment analysis and user-defined keywords, presenting only positive, career-focused content while filtering out anxiety-inducing topics like layoffs and economic downturns.

The platform features real-time news fetching from external APIs, AI-powered sentiment analysis using OpenAI's GPT-4o model, customizable keyword filtering, automated daily podcast generation, and a modern React-based interface with curated feeds, trending articles, and comprehensive settings management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **RSS Feed Integration with Resilient Fallbacks (August 2025)**: Completed robust news processing pipeline
  - Integrated feeds from TechCrunch, The Verge, Bloomberg, Reuters, Harvard Business Review, and others
  - RSS parsing with content cleaning and categorization processing 50+ articles
  - Basic curation system that works independently of AI quota limitations
  - Template-based podcast generation ensuring 5-10 minute daily digests
  - Complete fallback systems for both article curation and podcast generation
  - Real professional news content flowing through all features

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing with home and settings pages
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
- **Podcasts Table**: Stores generated daily podcast metadata, transcripts, and associated article references

### AI Integration Architecture
- **Sentiment Analysis**: OpenAI GPT-4o model analyzes article sentiment with confidence scoring
- **Content Summarization**: AI-generated summaries optimized for professional audiences
- **Keyword Extraction**: Automatic keyword identification for content categorization
- **Content Curation**: AI-driven article selection based on positivity and professional relevance
- **Podcast Generation**: Automated daily 5-10 minute podcast creation with AI-generated scripts and simulated TTS

### External Dependencies
- **News Data**: RSS feeds from major tech and business publications (TechCrunch, The Verge, Bloomberg, Reuters, etc.)
- **News Fallback**: NewsAPI.org as secondary source for additional content when needed
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
- **Daily Podcast Curation**: AI selects and sequences 5-8 articles for optimal podcast flow and professional relevance

### Application Structure
- **Home Page**: Features curated feed, top 5 articles preview, daily podcast generation, and filter effectiveness metrics at bottom
- **Settings Page**: Comprehensive filter management, keyword editing, sentiment thresholds, and live filter preview
- **Clean Interface**: Content first approach with key metrics visible at bottom and detailed controls in dedicated settings area