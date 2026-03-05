# E-commerce Platform PRD

## 1. Executive Summary

Build a Mintlify-inspired e-commerce platform that combines developer-friendly customization with AI-powered store management. The platform will offer a free tier with full access (revenue share model) and a paid tier with advanced features including team collaboration, AI editing agents, and mobile app generation.

## 2. Product Overview

### 2.1 Vision

A next-generation e-commerce platform inspired by Mintlify's approach to documentation, making store creation, customization, and management accessible to both technical and non-technical users through:

- **Mintlify-style configuration**: JSON config files and MDX content (no code deployment required)
- **Automated infrastructure**: GitHub repos and Vercel projects created automatically
- **Developer-friendly editing**: Web-based MDX editor with git-backed version control
- **Agentic AI assistance**: Comprehensive store management and optimization
- **GEO optimizations**: Built for AI search engine visibility and discoverability

### 2.2 Key Differentiators

- Free tier with full feature access (revenue share model)
- Developer-friendly MDX template system
- Built-in GEO optimizations for ChatGPT and AI search engines
- AI-powered store management agent
- Mobile app generator for paid tier
- Vercel-hosted deployment with custom domain support

## 3. Target Audience

**Primary Users:**

- **Developers**: Want custom store implementations with code-level control
- **Business Owners**: Need easy-to-use store builder with AI assistance
- **Agencies**: Building stores for multiple clients with reusable templates

## 4. Core Features

### 4.1 E-commerce Essentials

**MVP Features:**
- Product catalog and management (CRUD operations)
- Product variants (size, color, etc.)
- Inventory tracking and stock management
- Product categories
- Shopping cart and checkout flow
- Payment processing integration
- Pages (static content pages)
- Blog functionality

**Post-MVP Features:**
- Customer accounts and authentication
- Order management and fulfillment tracking
- Analytics and reporting dashboard
- Shipping and tax calculation
- Discount codes and promotions

### 4.2 Store Management

- Multi-store management (for agencies)
- Store templates and themes
- Custom domain configuration
- SSL certificate management
- Performance monitoring
- Backup and restore functionality

## 5. Technical Architecture

### 5.1 Core Framework

**Platform Architecture:**
- **Structure**: Single pnpm TypeScript monorepo containing all platform code
- **Admin Panel**: Next.js app with Shadcn/UI component library
- **Backend API**: tRPC with React Query
- **Database**: Single PostgreSQL database with Prisma ORM (multi-tenant)
- **Storage**: Object storage for media (S3-compatible)
- **Authentication**: Better-Auth for platform user authentication
- **Deployment**: Vercel for both platform and individual stores

**Store Architecture:**
- **Structure**: Each store is a separate GitHub repository and Vercel project
- **Content**: Stores contain only JSON configuration files and MDX content files (similar to Mintlify)
- **Rendering**: The platform's Next.js app dynamically renders stores based on their configuration
- **Repository Management**: GitHub App integration for automated repository creation and webhook handling
- **Ownership**: Platform-owned repositories (with future support for user-owned repos)

**Multi-Tenancy Model:**
- Organization-based data isolation using organization_id
- Users belong to organizations and can access stores within their organization
- Shared database with proper access controls and data partitioning

### 5.2 Store Rendering Architecture

**How Stores Work:**
- The platform runs a single Next.js application on Vercel
- Each store's Vercel project points to the platform's Next.js app
- Store content (JSON config + MDX files) lives in separate GitHub repositories
- The Next.js app dynamically fetches and renders stores based on:
  - Store domain/subdomain routing
  - Configuration from the store's GitHub repository
  - MDX content compiled on-demand or at build time
  - Product/inventory data from the shared database

**Content Flow:**
1. User edits MDX file in web editor
2. Publish commits changes to store's GitHub repository
3. GitHub webhook notifies Vercel
4. Vercel rebuilds/redeploys the store
5. Next.js app fetches updated content from GitHub
6. Store renders with new content

**Data Sources:**
- **GitHub Repository**: Configuration JSON, MDX content, theme files, assets
- **Platform Database**: Products, variants, inventory, orders, users, organizations
- **Vercel Environment**: Secrets, environment variables, build configuration

### 5.3 MDX and Content Management

**MDX Processing:**
- MDX files compiled to React components
- Support for custom React components
- Dynamic data binding from database
- Markdown with JSX interleaving

**Component Library:**
- Pre-built e-commerce components (product cards, cart, checkout)
- Layout components (headers, footers, navigation)
- Tailwind CSS for styling
- Customizable theme system

**Asset Management:**
- Images and media stored in object storage (S3-compatible)
- Optimized delivery via CDN
- Support for product images, logos, icons, etc.

### 5.4 Automated Store Provisioning

Upon new user account creation, the system will automatically:

1. **GitHub Repository Creation**

- Programmatically create a private GitHub repository via GitHub App
- Initialize with base store template (JSON config + example MDX files)
- Set up repository permissions and access controls
- Configure webhook integration for automated deployments
- Platform owns and manages repositories

2. **Vercel Project Setup**

- Create new Vercel project linked to the GitHub repository
- Configure build settings pointing to platform Next.js app
- Set up environment variables via Vercel API:
  - Database connection strings
  - API keys and secrets
  - Store-specific configuration
- Enable automatic deployments on push to main branch
- Configure SSL certificate management

3. **Organization Management**

- Create new organization record in database
- Associate user account with organization
- Store GitHub repository metadata (repo name, URL, access tokens)
- Store Vercel project metadata (project ID, deployment URLs)
- Manage organization-level settings and permissions

4. **Initial Store Setup**

- Initialize store configuration JSON (similar to Mintlify's docs.json):
  ```json
  {
    "$schema": "https://platform.com/store.json",
    "name": "My Store",
    "theme": "default",
    "colors": {
      "primary": "#16A34A",
      "secondary": "#07C983"
    },
    "logo": "/logo.svg",
    "navigation": {
      "categories": [],
      "pages": []
    }
  }
  ```
- Create example MDX files for:
  - Product pages
  - Category pages
  - Static pages (About, Contact, etc.)
  - Blog posts
- Store data lives in the shared platform database (not in the repository)

**Technical Implementation:**

- **GitHub App**: Automated repository creation, webhook management, and deployment triggers
- **Vercel API**: Project creation, environment variable management, domain configuration
- **Background Jobs**: Queue-based provisioning workflow with error handling and retry logic
- **Webhook Handlers**: GitHub push events trigger Vercel deployments
- **Database**: Organization-based data isolation with organization_id on all store-related tables

## 6. Pricing & Tiers

### 6.1 Free Tier

- **Access**: Full feature access
- **Revenue Model**: 5% + $0.50 per transaction
  - Platform tracks all transactions and calculates revenue share
  - Store owner is the merchant of record for customer transactions
  - Payouts require identity verification
  - Revenue share paid out upon request after verification
- **Limitations**:
  - Single user account
  - Basic support
  - Standard templates only
  - No AI editing agent
  - No mobile app generator

### 6.2 Paid Tier ($250/month)

- **Everything in Free Tier** plus:
- Team member management (unlimited)
- AI editing agent access
- Mobile app generator
- Premium templates
- Priority support
- Advanced analytics
- Custom integrations
- Reduced transaction fees (negotiable)

## 7. GEO Optimizations (Generative Engine Optimization)

### 7.1 Structured Data

- JSON-LD schema markup (Product, Organization, BreadcrumbList)
- Schema.org compliance
- Rich snippets for AI parsing
- Product information structured for AI consumption

### 7.2 Meta Optimization

- AI-optimized meta descriptions
- Semantic HTML structure
- Open Graph and Twitter Card optimization
- AI-friendly content summaries

### 7.3 Content Formatting

- Content structured for AI parsing
- Clear hierarchy and semantic markup
- Machine-readable product information
- Optimized for AI summarization

### 7.4 AI-Friendly Markup

- Semantic HTML5 elements
- ARIA labels for accessibility and AI
- Clean, parseable DOM structure
- Optimized for LLM consumption

### 7.5 Markdown Page Rendering

- **Critical Feature**: Every page must support markdown rendering
- **Implementation**: Appending `.md` to any page URL triggers markdown parser
- **Purpose**: Enables AI search engines to easily consume and parse page content
- **Example**:
  - HTML view: `https://store.com/products/shirt`
  - Markdown view: `https://store.com/products/shirt.md`
- All content (products, categories, pages, blog posts) must be available in markdown format

## 8. Agentic Assistance

### 8.1 Store Setup Agent

- Guided store creation wizard
- AI-powered store configuration
- Template selection assistance
- Domain setup guidance

### 8.2 Inventory Management Agent

- Product import and categorization
- Stock level monitoring and alerts
- Automated reordering suggestions
- Inventory optimization recommendations

### 8.3 Customer Service Agent

- Automated customer support responses
- Order status inquiries
- Return/refund processing assistance
- FAQ generation and management

### 8.4 Marketing Agent

- SEO optimization suggestions
- Content generation (product descriptions, blog posts)
- Email campaign recommendations
- Social media content suggestions
- GEO optimization recommendations

### 8.5 Analytics Agent

- Performance insights and recommendations
- Conversion optimization suggestions
- A/B testing recommendations
- Revenue forecasting

## 9. MDX Template System

### 9.1 Template Structure

- MDX files for page templates stored in GitHub repository
- React component integration
- Dynamic data binding
- Template variables and props
- Conditional rendering support

### 9.2 Web-Based Editor

- **Editor Interface**: Monaco editor or similar for MDX editing
- **Draft/Publish Workflow**:
  - Changes are saved as drafts (not immediately committed)
  - Users can preview drafts in real-time
  - Publishing commits changes to the GitHub repository
  - Triggers automatic Vercel deployment via webhook
- **Live Preview**: Real-time preview of changes before publishing
- **Version Control**: Full git history maintained in GitHub repository

### 9.3 Template Features

- Component library integration
- Style customization (Tailwind/CSS)
- Responsive design templates
- Syntax highlighting for MDX
- Component palette for quick insertion

### 9.4 Initial Templates

- **Purpose**: Static boilerplate for new stores
- **Distribution**: Available on open-source repository
- **Updates**: No automatic updates required (templates are starting points)
- **Customization**: Users fully own and customize their templates
- Templates include examples for:
  - Product pages
  - Category listings
  - Blog posts
  - Static pages (About, Contact, etc.)

## 10. Mobile App Generator (Paid Tier)

### 10.1 Features

- Generate native iOS and Android apps
- PWA generation option
- App store submission assistance
- Push notification setup
- Deep linking configuration
- App analytics integration

### 10.2 Technical Approach

- React Native or Expo-based generation
- Store API integration
- Offline capability
- Native payment processing
- App icon and splash screen customization

## 11. Deployment Framework

### 11.1 Vercel-Based Deployment

- **Platform**: All stores hosted exclusively on Vercel
- **Deployment Trigger**: Automatic deployment on push to main branch via GitHub App webhook
- **Custom Domains**:
  - Managed via Vercel API
  - Users add DNS records to their domain registrar
  - Vercel handles SSL certificate provisioning and renewal
  - Reference: [Vercel Add Domain API](https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project)
- **Edge Network**: Automatic CDN and edge deployment via Vercel
- **No Self-Hosting**: Platform does not support self-hosted deployments

### 11.2 Deployment Features

- **Automatic Deployments**: Push to GitHub triggers Vercel build and deploy
- **Environment Management**: Environment variables managed via Vercel API
- **Preview Deployments**: Branch deployments for testing (future consideration)
- **Rollback**: Vercel dashboard provides deployment history and rollback
- **Health Monitoring**: Vercel's built-in monitoring and analytics
- **SSL/HTTPS**: Automatic SSL certificate management for all domains

## 12. Success Metrics

### 12.1 Business Metrics

- Number of stores created
- Monthly recurring revenue (MRR)
- Transaction volume
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Churn rate

### 12.2 Product Metrics

- Store creation time
- Template usage
- AI agent engagement
- GEO optimization effectiveness
- Mobile app adoption
- User satisfaction scores

## 13. Roadmap Considerations

### 13.1 Phase 1 (MVP)

**Authentication & User Management:**
- Better-Auth integration for platform users only
- Organization-based multi-tenancy
- User and organization management

**Automated Provisioning:**
- GitHub App setup for automated repository creation
- Vercel API integration for project creation
- Automated webhook configuration
- Environment variable management via Vercel API

**Core E-commerce Features:**
- Product catalog with CRUD operations
- Product variants (size, color, etc.)
- Inventory tracking
- Product categories
- Shopping cart functionality
- Basic checkout flow
- Payment processing integration
- Static pages
- Blog functionality

**Store Management:**
- Web-based MDX editor with draft/publish workflow
- JSON configuration system (Mintlify-style)
- GitHub commit integration
- Vercel deployment automation

**GEO Optimizations:**
- Markdown page rendering (all pages accessible with .md extension)
- Basic schema markup (Product, Organization)
- Semantic HTML structure

**Infrastructure:**
- Custom domain support via Vercel API
- SSL certificate management
- Single shared PostgreSQL database with multi-tenancy

### 13.2 Phase 2

**Feature Expansion:**
- Customer accounts and authentication for stores
- Order management and fulfillment tracking
- Shipping and tax calculation
- Discount codes and promotions
- Advanced analytics dashboard

**Collaboration:**
- Team member management
- Role-based access control
- Multi-store management for agencies

**Content & Templates:**
- Template marketplace (community templates)
- Premium template offerings

### 13.3 Phase 3

**AI-Powered Features:**
- AI editing agent (paid tier)
- Agentic assistance (store setup, inventory, customer service)
- Marketing agent for content generation

**Advanced Capabilities:**
- Mobile app generator (paid tier)
- Advanced GEO optimizations
- A/B testing framework
- User-owned GitHub repositories (vs platform-owned)

### 13.4 Future Considerations

- Multi-language support
- International payment methods
- Advanced AI features
- Marketplace for extensions
- White-label options

## 14. Technical Requirements

### 14.1 Performance

- Page load time < 2 seconds
- 99.9% uptime SLA
- CDN integration
- Image optimization
- Code splitting and lazy loading

### 14.2 Security

- **Payment Security**: Use tokenized payment processing (no direct credit card handling)
- **Data Encryption**: All data encrypted at rest and in transit (TLS/SSL)
- **Authentication**: Better-Auth with secure session management
- **Access Control**: Role-based access control (RBAC) for organizations
- **Two-Factor Authentication**: Support for 2FA on platform accounts
- **Regular Audits**: Security audits and vulnerability scanning
- **Secrets Management**: Environment variables stored securely on Vercel

### 14.3 Scalability

- Horizontal scaling support
- Database optimization
- Caching strategies
- Load balancing
- Auto-scaling capabilities

## 15. User Experience

### 15.1 Onboarding

**Automated Provisioning Flow:**

1. **User Signup**:
   - User creates account via Better-Auth
   - Platform authentication only (no store customer auth in MVP)

2. **Automated Provisioning** (background jobs):
   - Create organization record in database
   - Create private GitHub repository via GitHub App
   - Initialize repository with:
     - Store configuration JSON
     - Example MDX files (products, categories, pages, blog)
   - Create Vercel project linked to repository
   - Configure environment variables on Vercel
   - Set up GitHub webhook for automated deployments

3. **Guided Setup**:
   - Basic store configuration (name, colors, branding)
   - Add first products via admin panel
   - Configure payment processing
   - Customize pages using web-based MDX editor

4. **Go Live**:
   - Store automatically deployed to Vercel
   - Accessible via default Vercel URL
   - Custom domain can be added later

**Key Points:**
- No coding required for basic setup
- All changes committed to GitHub automatically
- Live preview before publishing changes
- Full git history maintained

### 15.2 Dashboard

- Store overview
- Quick actions
- Analytics summary
- AI agent suggestions
- Recent activity

### 15.3 Editor Experience

**Web-Based MDX Editor:**
- Monaco editor (or similar) for editing MDX files
- Syntax highlighting for MDX/JavaScript/CSS
- Component palette for quick insertion
- File tree for navigating store content

**Draft/Publish Workflow:**
1. Edit MDX files in web editor
2. Changes saved as drafts (not committed)
3. Live preview of draft changes
4. Click "Publish" to commit to GitHub
5. GitHub webhook triggers Vercel deployment
6. Changes go live automatically

**Features:**
- Real-time preview panel
- Side-by-side editing and preview
- Version history via git
- Rollback to previous versions
- Conflict detection and resolution

## 16. Integration Requirements

### 16.1 Payment Processors

**MVP Approach:**
- Store owners are the merchant of record
- Platform tracks all transactions manually
- Revenue share (5% + $0.50 per transaction) calculated by platform
- Payouts processed after identity verification
- No Stripe Connect required for MVP

**Supported Payment Methods:**
- Payment gateway integration (specific provider TBD)
- Future considerations: Stripe, PayPal, Square
- Custom payment methods (post-MVP)

### 16.2 Shipping Providers

- USPS
- FedEx
- UPS
- DHL
- Custom shipping calculators

### 16.3 Third-Party Services

- Email service providers
- Analytics (Google Analytics, custom)
- Marketing tools
- Customer service platforms

### 16.4 Infrastructure Integrations

- **GitHub API**: Repository creation, webhook management, access control
- **Vercel API**: Project creation, deployment management, environment variables
- **Better-Auth**: Authentication and session management
- **GitHub OAuth**: User authentication and repository access

## 17. Compliance & Legal

### 17.1 Requirements

- GDPR compliance
- CCPA compliance
- Terms of Service
- Privacy Policy
- Cookie consent management
- Tax calculation compliance

## 18. Support & Documentation

### 18.1 Documentation

- API documentation
- Template development guide
- GEO optimization guide
- Deployment guides
- Video tutorials

### 18.2 Support Channels

- Email support (all tiers)
- Priority support (paid tier)
- Community forum
- Knowledge base
- AI-powered help system

---

## 19. Key Architectural Decisions

### 19.1 Platform vs Store Separation

**Platform (Single Monorepo):**
- Admin dashboard for store management
- tRPC API + React Query
- Better-Auth for platform users
- Shared PostgreSQL database
- Hosted on Vercel

**Stores (Individual Repos):**
- JSON configuration files
- MDX content files
- Rendered by platform's Next.js app
- Each store = separate GitHub repo + Vercel project
- No application code in store repos

### 19.2 Content vs Data Separation

**Content (in GitHub):**
- Store configuration (colors, branding, navigation)
- MDX files for pages, blog posts
- Static assets
- Version-controlled via git

**Data (in Database):**
- Products and variants
- Inventory levels
- Orders and transactions
- User accounts and organizations
- All store operational data

### 19.3 Rendering Model

Similar to Mintlify's approach:
- Platform hosts a single Next.js application
- Application dynamically renders stores based on configuration
- Each store deployment points to the same Next.js app
- Routing based on domain/subdomain
- Content fetched from store's GitHub repo
- Data fetched from shared database

---

## 20. Open Questions & Future Clarifications

### 20.1 AI Agent Implementation (Phase 3)

**Questions to Address:**
- Will AI editing agent directly commit to GitHub or require approval?
- What LLM/service will power the AI agents?
- How will AI agent usage be metered and billed?

### 20.2 Multi-Store Management

**Questions to Address:**
- For agencies: Multiple organizations under one account or multiple team members in one org?
- How to handle billing for multiple stores?
- Store transfer capabilities between organizations?

### 20.3 Payment Gateway Selection

**Questions to Address:**
- Which payment gateway for MVP?
- How to implement transaction tracking without Stripe Connect?
- Identity verification process for payouts?
- International payment support timeline?

### 20.4 Template Marketplace

**Questions to Address:**
- Revenue sharing model for premium templates?
- Template review and approval process?
- Template licensing and ownership?