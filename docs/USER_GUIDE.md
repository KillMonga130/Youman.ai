# AI Humanizer User Guide

Welcome to the AI Humanizer! This guide will help you get started with transforming AI-generated content into natural, human-like text.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Project](#creating-your-first-project)
3. [Understanding Humanization Levels](#understanding-humanization-levels)
4. [Transformation Strategies](#transformation-strategies)
5. [Protected Segments](#protected-segments)
6. [Understanding Metrics](#understanding-metrics)
7. [Version Control](#version-control)
8. [Collaboration](#collaboration)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating an Account

1. Visit the AI Humanizer website
2. Click "Sign Up" in the top right corner
3. Enter your email address and create a password
4. Verify your email address
5. Complete your profile setup

### Dashboard Overview

After logging in, you'll see your dashboard with:

- **Recent Projects**: Quick access to your latest work
- **Quick Stats**: Usage statistics and quota information
- **Quick Actions**: Buttons to create new projects or upload documents

---

## Creating Your First Project

### Method 1: Paste Text

1. Click "New Project" on the dashboard
2. Give your project a name
3. Paste your AI-generated text into the editor
4. Click "Humanize" to start the transformation

### Method 2: Upload Document

1. Click "New Project" on the dashboard
2. Drag and drop a file or click "Upload"
3. Supported formats: DOCX, PDF, TXT, EPUB
4. The content will be extracted automatically

### Method 3: Import from Cloud

1. Click "New Project" on the dashboard
2. Select "Import from Cloud"
3. Connect your Google Drive, Dropbox, or OneDrive
4. Browse and select your file

---

## Understanding Humanization Levels

The humanization level controls how much the text is transformed:

| Level | Name | Description | Use Case |
|-------|------|-------------|----------|
| 1 | Minimal | Subtle changes, <20% modified | Light touch-ups |
| 2 | Light | Moderate changes, ~30% modified | Minor improvements |
| 3 | Moderate | Balanced transformation (default) | General use |
| 4 | Strong | Significant changes, ~50% modified | Heavy transformation |
| 5 | Maximum | Aggressive changes, >60% modified | Complete rewrite |

### Choosing the Right Level

- **Level 1-2**: Use when your text is already good but needs minor adjustments
- **Level 3**: Best for most content - balances transformation with meaning preservation
- **Level 4-5**: Use when AI detection scores are high and you need significant changes

---

## Transformation Strategies

### Casual Strategy

Best for:
- Blog posts
- Social media content
- Personal emails
- Informal articles

Characteristics:
- Uses contractions (don't, won't, can't)
- Includes colloquial expressions
- Conversational tone
- Shorter sentences

### Professional Strategy

Best for:
- Business documents
- Corporate communications
- Reports
- Formal emails

Characteristics:
- Maintains formal tone
- Varied sentence structure
- Professional vocabulary
- Clear and concise

### Academic Strategy

Best for:
- Research papers
- Academic essays
- Scholarly articles
- Technical documentation

Characteristics:
- Preserves scholarly language
- Includes hedging language ("suggests", "may indicate")
- Maintains citation patterns
- Complex sentence structures

### Auto Strategy

Let the AI Humanizer automatically detect the best strategy based on your content's tone and style.

---

## Protected Segments

Protect specific text from being modified using delimiters.

### Default Delimiters

Use double brackets to protect text:

```
The [[technical term]] should remain unchanged.
```

### Custom Delimiters

Configure custom delimiters in project settings:

```
The {!important phrase!} will be preserved.
```

### What to Protect

- Technical terminology
- Brand names
- Proper nouns
- Code snippets
- Quotes
- Legal language

---

## Understanding Metrics

### Detection Scores

After transformation, you'll see detection scores from multiple AI detectors:

- **GPTZero**: Academic-focused detector
- **Originality.ai**: Content marketing detector
- **Turnitin**: Academic integrity checker
- **Average**: Combined score across all detectors

**Goal**: Lower scores indicate more human-like content. Aim for scores below 20%.

### Text Metrics

| Metric | Description | Target Range |
|--------|-------------|--------------|
| Perplexity | Text unpredictability | 40-120 |
| Burstiness | Sentence length variation | >0.6 |
| Lexical Diversity | Vocabulary variety | >0.5 |
| Modification % | Amount of text changed | Varies by level |

### Before/After Comparison

The comparison view shows:
- **Green highlights**: Added text
- **Red highlights**: Removed text
- **Yellow highlights**: Modified text

---

## Version Control

### Auto-Save

Your work is automatically saved every 2 minutes. You'll see a "Saved" indicator in the editor.

### Manual Versions

Create named versions at important milestones:

1. Click "Save Version" in the toolbar
2. Enter a version name (e.g., "First draft", "After review")
3. Click "Save"

### Version History

Access all versions:

1. Click "History" in the sidebar
2. Browse versions by date
3. Click any version to preview
4. Use "Restore" to revert to that version

### Comparing Versions

1. Select two versions in the history
2. Click "Compare"
3. View side-by-side differences

### Branching

Create branches to explore different transformation approaches:

1. Click "Create Branch" from any version
2. Name your branch
3. Make changes without affecting the main version
4. Merge back when satisfied

---

## Collaboration

### Inviting Team Members

1. Open your project
2. Click "Share" in the toolbar
3. Enter collaborator's email
4. Select permission level:
   - **Viewer**: Can view only
   - **Editor**: Can edit content
   - **Admin**: Full access including settings

### Real-Time Collaboration

When multiple users edit simultaneously:
- See other users' cursors in real-time
- Changes sync within 200ms
- Conflict resolution is automatic

### Activity Log

Track all changes:
1. Click "Activity" in the sidebar
2. View who made what changes and when

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+F | Find |
| Ctrl+H | Find and Replace |
| Esc | Close modal/panel |

### Editor

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Humanize selected text |
| Ctrl+Shift+H | Humanize all |
| Ctrl+D | Detect AI score |
| Ctrl+B | Bold |
| Ctrl+I | Italic |

### Navigation

| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Go to Dashboard |
| Ctrl+2 | Go to Editor |
| Ctrl+3 | Go to History |
| Ctrl+4 | Go to Settings |

### Customizing Shortcuts

1. Go to Settings > Keyboard Shortcuts
2. Click on any shortcut to change it
3. Press your desired key combination
4. Click "Save"

---

## Troubleshooting

### High Detection Scores

If your transformed text still has high AI detection scores:

1. **Increase the humanization level** - Try level 4 or 5
2. **Change strategy** - Try a different transformation strategy
3. **Re-process specific sections** - Select high-scoring paragraphs and re-humanize
4. **Add personal touches** - Manually edit some sentences

### Slow Processing

For large documents:

1. Processing is done in chunks for efficiency
2. Progress updates appear every 10,000 words
3. You can pause and resume long transformations
4. Consider splitting very large documents

### Lost Work

If you lose unsaved work:

1. Check auto-save versions in History
2. Look for "Recovered" versions
3. Contact support if needed

### Connection Issues

If you experience connection problems:

1. Check your internet connection
2. Refresh the page
3. Your work is saved locally and will sync when reconnected

### Account Issues

For login or account problems:

1. Try "Forgot Password" to reset
2. Clear browser cache and cookies
3. Try a different browser
4. Contact support at support@aihumanizer.com

---

## Getting Help

- **Documentation**: Visit our help center at help.aihumanizer.com
- **Video Tutorials**: Watch step-by-step guides on our YouTube channel
- **Email Support**: support@aihumanizer.com
- **Live Chat**: Available in the app during business hours
- **Community Forum**: Join discussions at community.aihumanizer.com

---

## Tips for Best Results

1. **Start with Level 3** - Adjust up or down based on results
2. **Use Auto Strategy** - Let the system detect the best approach
3. **Protect important terms** - Use delimiters for technical language
4. **Review before publishing** - Always do a final human review
5. **Test with multiple detectors** - Different detectors have different strengths
6. **Save versions often** - Create checkpoints at important stages
7. **Use templates** - Save your preferred settings as templates
