# GitHub Push Setup Guide

## Prerequisites

1. **Git Installation**
   - Download from: https://git-scm.com/download/win
   - Install with default options
   - Restart PowerShell after installation

2. **GitHub Account**
   - Create at: https://github.com/signup
   - Or use existing account

3. **Personal Access Token** (easier than SSH for first-time setup)
   - Go to: https://github.com/settings/tokens/new
   - Click "Generate new token (classic)"
   - Name: "Bus-GPS-Tracking"
   - Scope: Check `repo` (full control)
   - Click "Generate token"
   - **Copy and save the token** (you won't see it again)

---

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Enter repository name: `Bus-GPS-Tracking`
3. Description: "Real-time bus GPS tracking system with React frontend, Node.js backend, and ESP32 hardware"
4. Choose: Public or Private
5. **Do NOT** check "Initialize this repository with a README"
6. Click "Create repository"

After creation, you'll see instructions. Copy your repository URL (looks like: `https://github.com/YOUR_USERNAME/Bus-GPS-Tracking.git`)

---

## Step 2: Configure Git (First Time Only)

Open PowerShell and run:

```powershell
git config --global user.name "Your GitHub Username"
git config --global user.email "your.email@example.com"
```

Verify:
```powershell
git config --global user.name
git config --global user.email
```

---

## Step 3: Initialize & Commit Your Project

```powershell
# Navigate to project
cd e:\Bus

# Check if git is already initialized
git status
# If you see "fatal: not a git repository", continue to next command

# Initialize git repository
git init

# Add all project files
git add .

# Create initial commit
git commit -m "Initial commit: Bus GPS tracking system with ESP32, Node backend, React frontend, and documentation"

# Verify commit
git log --oneline
```

---

## Step 4: Push to GitHub

**Option A: Using Personal Access Token (Recommended for beginners)**

```powershell
# Set your repository URL
$repoUrl = "https://github.com/YOUR_USERNAME/Bus-GPS-Tracking.git"

# Add remote
git remote add origin $repoUrl

# Rename branch to main (GitHub default)
git branch -M main

# Push to GitHub
git push -u origin main
```

When prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Paste the Personal Access Token you created earlier

**Option B: Using HTTPS with Token in URL (One-liner)**

```powershell
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/Bus-GPS-Tracking.git
git branch -M main
git push -u origin main
```

Replace:
- `YOUR_TOKEN` with your Personal Access Token
- `YOUR_USERNAME` with your GitHub username

**Option C: Using SSH (More Secure)**

Generate SSH key:
```powershell
ssh-keygen -t ed25519 -C "your.email@example.com"
# Press Enter 3 times to accept defaults
```

Add SSH key to GitHub:
1. Copy key: `Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard`
2. Go to: https://github.com/settings/keys
3. Click "New SSH key"
4. Paste the key, save

Then push using SSH:
```powershell
git remote add origin git@github.com:YOUR_USERNAME/Bus-GPS-Tracking.git
git branch -M main
git push -u origin main
```

---

## Complete Copy-Paste Commands

After creating your GitHub repo, run these in PowerShell:

```powershell
# Set variables (replace with your values)
$githubUsername = "YOUR_USERNAME"
$githubToken = "ghp_XXXXXXXXXXXXXXXXXXXX" # Your Personal Access Token
$repoName = "Bus-GPS-Tracking"

# Navigate to project
cd e:\Bus

# Initialize git
git init

# Configure git (one-time)
git config --global user.name $githubUsername
git config --global user.email "your.email@example.com"

# Add all files
git add .

# Commit
git commit -m "Initial commit: Bus GPS tracking system with ESP32, Node.js backend, React frontend"

# Add remote repository
git remote add origin "https://${githubToken}@github.com/${githubUsername}/${repoName}.git"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main

# Verify
git remote -v
git branch -a
```

---

## Verify Your Push

1. Go to: `https://github.com/YOUR_USERNAME/Bus-GPS-Tracking`
2. Verify all folders are present:
   - ✅ `backend/`
   - ✅ `frontend/`
   - ✅ `db/`
   - ✅ `docs/`
   - ✅ `scripts/`
   - ✅ `README.md`
   - ✅ `.gitignore`
   - ✅ `PROJECT_DOCUMENTATION.md`

---

## Post-Push: Future Commits

For future changes:

```powershell
cd e:\Bus

# Make changes to files...

# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "Describe your changes here"

# Push to GitHub
git push
```

---

## Troubleshooting

### "fatal: not a git repository"
- Run: `git init`

### "Permission denied (publickey)" with SSH
- Ensure SSH key is added to GitHub: https://github.com/settings/keys
- Test: `ssh -T git@github.com`

### "fatal: authentication failed" with HTTPS
- Use Personal Access Token (not password)
- Verify token has `repo` scope
- If token expired, generate new one

### "The branch 'main' is not fully merged"
- Run: `git push -u origin main --force` (careful with --force!)

### Remote already exists
- List remotes: `git remote -v`
- Remove: `git remote remove origin`
- Then add again

### Large files (.db file)
- If you see "File too large" error on database file, it's being ignored by `.gitignore` (already configured)

---

## Additional Resources

- **Git Documentation:** https://git-scm.com/doc
- **GitHub Docs:** https://docs.github.com
- **Personal Access Tokens:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- **SSH Keys:** https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## Project Structure on GitHub

Your repository will show:

```
Bus-GPS-Tracking/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── MapView.jsx
│       └── main.jsx
├── db/
│   └── schema.sql
├── docs/
│   ├── esp32_payload.md
│   └── PROJECT_DOCUMENTATION.md
├── scripts/
│   └── seed_db.sql
├── .gitignore
├── README.md
```

---

**Ready to push? Follow the "Complete Copy-Paste Commands" section above!**
