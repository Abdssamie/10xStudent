# How to Create Skills Using the Skill Creator

## Overview

The skill-creator helps you create "skills" - specialized instruction sets that extend an AI agent's capabilities. Think of skills as expert guides that teach the AI how to handle specific domains or tasks.

## The Methodology

### Step 1: Understand What You Need

Before creating a skill, identify:
- **What task** does this skill help with?
- **When should it trigger?** (specific file types, keywords, scenarios)
- **What knowledge** does the AI need that it doesn't already have?

**Example**: "I want the AI to help me work with PDF files - rotating, merging, extracting text, etc."

### Step 2: Have a Conversation with the AI

Simply tell the AI what you want:

```
"I want to create a skill for working with PDF files. 
It should help with rotating, merging, splitting, and extracting text from PDFs."
```

The AI (using this skill-creator) will:
1. Ask clarifying questions about your use case
2. Identify what scripts/references/assets would be helpful
3. Create the skill structure for you
4. Write the SKILL.md with appropriate instructions

### Step 3: The AI Creates the Skill

The AI will run commands like:

```bash
# Initialize the skill structure
scripts/init_skill.py pdf-editor --path skills/public --resources scripts,references

# This creates:
# pdf-editor/
# ├── SKILL.md (instructions for the AI)
# ├── agents/openai.yaml (UI metadata)
# ├── scripts/ (helper scripts)
# └── references/ (documentation)
```

### Step 4: The AI Populates the Skill

The AI will:
1. **Write SKILL.md** with:
   - Clear description of when to use the skill
   - Step-by-step workflows
   - Examples of common tasks

2. **Create helper scripts** (if needed):
   - `scripts/rotate_pdf.py` - Rotate PDF pages
   - `scripts/merge_pdfs.py` - Merge multiple PDFs
   - These are reusable, tested code

3. **Add reference docs** (if needed):
   - `references/api_docs.md` - Detailed API documentation
   - `references/examples.md` - Common patterns

4. **Generate UI config**:
   - Creates `agents/openai.yaml` with nice display name, description, icon

### Step 5: Test and Iterate

After creation:
1. Try using the skill on real tasks
2. Notice what works and what doesn't
3. Ask the AI to improve the skill based on feedback

## Real Example Conversation

**You**: "Create a skill to help me work with my company's database schema. We use PostgreSQL and have tables for users, orders, and products."

**AI**: "I'll create a database-query skill for you. A few questions:
- Do you have documentation for the schema I should include?
- Are there common queries you run frequently?
- Any specific naming conventions or business rules I should know?"

**You**: "Yes, here's our schema doc [paste]. Common queries are: daily sales, user signups, inventory levels."

**AI**: 
```bash
# Creates the skill
scripts/init_skill.py company-database --path skills/private --resources references

# Writes SKILL.md with:
# - When to use: "Use when querying company database"
# - Schema documentation
# - Common query patterns
# - Business rules

# Adds references/schema.md with your full schema
# Adds references/common_queries.md with example queries
```

**Result**: Now when you ask "How many users signed up yesterday?", the AI:
1. Recognizes this is a database query (triggers the skill)
2. Loads the skill's SKILL.md
3. Reads the schema from references/
4. Writes the correct SQL query using your table structure

## What Makes a Good Skill?

### ✅ Good Skill Examples:

1. **Domain-Specific Knowledge**
   - Company database schemas
   - Brand guidelines
   - Internal APIs
   - Business processes

2. **Specialized Workflows**
   - Document processing (PDF, DOCX)
   - Data transformations
   - Deployment procedures
   - Testing protocols

3. usable Tools**
   - Scripts that get rewritten often
   - Complex operations that need consistency
   - Integration with specific tools

### ❌ Not Good for Skills:

- General programming knowledge (AI already knows this)
- Simple one-off tasks
- Things that change constantly

## The Agent-Agnostic Part

When you create a skill, you can specify which platform you're using:

```bash
# For OpenAI platform
scripts/init_skill.py my-skill --path skills/public --agent openai

# For Anthropic platform
scripts/init_skill.py my-skill --path skills/public --agent anthropic

# Generic (works anywhere)
scripts/init_skill.py my-skill --path skills/public --agent gen
**But remember**: The `--agent` flag only affects the UI config file. The actual skill instructions in `SKILL.md` work with any AI agent.

## Quick Start

Just tell the AI:

```
"I want to create a skill for [describe your use case]. 
Can you help me set it up?"
```

The AI will guide you through the process, ask the right questions, and create everything you need.

## Advanced: Multiple Platform Support

If you want your skill to work across multiple platforms:

```bash
# Create with OpenAI config
scripts/init_skill.py my-skill --path skills/public --agent openai

# Add Anthropic config
scripts/generate_agent_skills/public/my-skill --agent anthropic

# Now you have:
# my-skill/
# ├── SKILL.md (works with any AI)
# ├── agents/
# │   ├── openai.yaml (OpenAI UI)
# │   └── anthropic.yaml (Anthropic UI)
```

## Summary

1. **You don't run the scripts manually** - just tell the AI what you want
2. **The AI uses this skill-creator** to build the skill for you
3. **Agent configs are for UI only** - the actual skill works with any AI
4. **Skills are living documents** - iterate and improve them over time

The skill-creator is a meta-tool: it's a skill that helps the AI create more skills!
