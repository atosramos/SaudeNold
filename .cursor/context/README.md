# Context Engineering - SaudeNold

This directory contains structured context files for systematic context engineering in the SaudeNold project.

## Purpose

These files provide comprehensive, structured context about the project to enable:
- Better AI assistance understanding
- Faster onboarding for new developers
- Consistent decision-making
- Reduced context switching

## File Structure

```
.cursor/context/
├── README.md                    # This file
├── PROJECT-OVERVIEW.md          # High-level project overview
├── ARCHITECTURE.md              # System architecture details
├── BACKEND-CONTEXT.md           # Backend-specific context
├── FRONTEND-CONTEXT.md          # Frontend-specific context
├── MULTIEMPRESA-CONTEXT.md      # Multi-tenant system context
└── CURRENT-STATE.md             # Current implementation state
```

## Usage Guidelines

### For AI Assistants
1. Read `PROJECT-OVERVIEW.md` first for high-level understanding
2. Read `CURRENT-STATE.md` to understand what's implemented
3. Read relevant context file based on task:
   - Backend work → `BACKEND-CONTEXT.md`
   - Frontend work → `FRONTEND-CONTEXT.md`
   - Multi-tenant features → `MULTIEMPRESA-CONTEXT.md`
   - Architecture decisions → `ARCHITECTURE.md`

### For Developers
1. Start with `PROJECT-OVERVIEW.md` for project understanding
2. Read `ARCHITECTURE.md` for system design
3. Read relevant context file for your area
4. Check `CURRENT-STATE.md` before starting new features

## Maintenance

### When to Update
- After completing major features
- After architectural changes
- After adding new technologies
- When onboarding new team members
- Monthly review (recommended)

### Update Process
1. Identify which context file(s) need updates
2. Update relevant sections
3. Update "Last Updated" date
4. Commit with descriptive message

## Context File Descriptions

### PROJECT-OVERVIEW.md
**Purpose**: High-level understanding of the project  
**Audience**: Everyone  
**Contents**: What, why, who, status, key metrics

### ARCHITECTURE.md
**Purpose**: System design and architecture  
**Audience**: Developers, architects  
**Contents**: Architecture diagrams, data flow, security model, deployment

### BACKEND-CONTEXT.md
**Purpose**: Backend-specific implementation details  
**Audience**: Backend developers  
**Contents**: Tech stack, models, endpoints, patterns, testing

### FRONTEND-CONTEXT.md
**Purpose**: Frontend-specific implementation details  
**Audience**: Frontend developers  
**Contents**: Tech stack, components, services, patterns, UI/UX

### MULTIEMPRESA-CONTEXT.md
**Purpose**: Multi-tenant system details  
**Audience**: All developers  
**Contents**: Isolation strategy, permissions, migration, testing

### CURRENT-STATE.md
**Purpose**: Current implementation status  
**Audience**: Everyone  
**Contents**: Completed features, partial implementations, known issues, priorities

## Best Practices

1. **Keep Updated**: Update context files as project evolves
2. **Be Specific**: Include code examples and patterns
3. **Link Related Docs**: Reference other documentation
4. **Version Control**: Track changes in git
5. **Review Regularly**: Monthly review recommended

## Integration with .cursorrules

The `.cursorrules` file references these context files and provides:
- Quick access to context
- Rules for using context
- Guidelines for maintaining context

## Future Enhancements

- [ ] Automated context updates from code analysis
- [ ] Context validation scripts
- [ ] Context search/indexing
- [ ] Context versioning
- [ ] Context diff tracking
