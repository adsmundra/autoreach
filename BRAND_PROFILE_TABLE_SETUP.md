# Brand Profile Table Setup Guide

## Issue: "Failed to create brand"

If you're getting a "Failed to create brand" error, the most common cause is that the `brand_profile` table doesn't exist in your database.

---

## ✅ Solution: Create the Table

### Option 1: Using Drizzle Migrations (Recommended)

Run these commands in order:

```bash
# 1. Generate migrations for the schema
npm run db:generate

# 2. Push migrations to your database
npm run db:push
```

Then try creating a brand again.

### Option 2: Manual SQL (If Migrations Don't Work)

If the above doesn't work, you can create the table manually:

```sql
CREATE TABLE IF NOT EXISTS brand_profile (
  id UUID PRIMARY KEY NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brandurl TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL,
  location TEXT DEFAULT 'Global',
  email TEXT
);

-- Optional: Add index for user_id for faster queries
CREATE INDEX idx_brand_profile_user_id ON brand_profile(user_id);
```

---

## 🔍 Verify the Table Exists

### Option 1: Using Drizzle Studio

```bash
npm run db:studio
```

This opens a visual database explorer. Check if `brand_profile` table exists.

### Option 2: Using PostgreSQL CLI

```bash
# Connect to your database
psql your_database_url

# List all tables
\dt

# Check brand_profile table structure
\d brand_profile
```

---

## 🧪 Test the Feature

After creating the table:

1. Navigate to: `http://localhost:3000/brand-profiles`
2. You should see the empty state form
3. Fill in the form and click "Create Brand Profile"
4. Brand should now be created successfully

---

## 📝 Database Schema

The `brand_profile` table has these columns:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PRIMARY KEY, NOT NULL, UNIQUE | Unique identifier |
| user_id | TEXT | NOT NULL | Links to authenticated user |
| brand_name | TEXT | NOT NULL | Brand/company name |
| brandurl | TEXT | NOT NULL, UNIQUE | Company website URL |
| industry | TEXT | NOT NULL | Industry/sector |
| location | TEXT | DEFAULT 'Global' | Geographic location |
| email | TEXT | (optional) | Contact email |

---

## 🔗 Related Tables

The system also uses the `brand_analyses` table for storing analysis history:

```sql
CREATE TABLE IF NOT EXISTS brand_analyses (
  id UUID PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  company_name TEXT,
  industry TEXT,
  analysis_data JSONB,
  competitors JSONB,
  prompts JSONB,
  credits_used INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ Troubleshooting

### Issue: "Unauthorized - Please log in"
- **Solution**: You must be logged in to create brands
- Go to login/signup first, then create brands

### Issue: "Missing required fields"
- **Solution**: All 4 required fields must be filled:
  - Brand Name
  - Website URL
  - Industry
  - Location

### Issue: Table still doesn't exist
1. Check `.env.local` - ensure `DATABASE_URL` is correct
2. Verify you have access to the database
3. Check Drizzle Studio to see all tables: `npm run db:studio`
4. If needed, reset migrations: `npm run db:drop` then `npm run db:push`

### Issue: "URL must be unique"
- **Solution**: The website URL is unique. Each brand needs a different URL.

---

## 🚀 Next Steps

After successfully creating a brand:

1. ✅ Brand appears in the list
2. ✅ Click "View Profile" to see details
3. ✅ Add more brands using "New Brand" button
4. ✅ Search and filter brands
5. ✅ Delete brands as needed

---

## 📚 Related Commands

```bash
# View database visually
npm run db:studio

# Generate new migrations
npm run db:generate

# Push changes to database
npm run db:push

# Drop all tables (WARNING: destructive!)
npm run db:drop

# Run migrations
npm run db:migrate
```

---

**Last Updated**: November 18, 2024
**Status**: Ready for Setup ✅
