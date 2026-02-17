# Claude Code WSL Setup Guide

Step-by-step instructions to set up a new WSL session on a fresh machine for working with this project.

---

## Prerequisites

- WSL2 with a Linux distro (Rocky Linux 9 / RHEL / Ubuntu)
- Claude Code CLI installed

---

## 1. Git Setup

```bash
# Identity
git config --global user.name "icediceice"
git config --global user.email "icediceice@users.noreply.github.com"

# Credential storage
git config --global credential.helper store

# Store GitHub PAT (replace TOKEN with your actual token — needs 'repo' + 'workflow' + 'write:packages' scopes)
printf "https://icediceice:TOKEN@github.com\n" > ~/.git-credentials
chmod 600 ~/.git-credentials
```

---

## 2. Install Docker

### Rocky Linux / RHEL / CentOS
```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
```

### Ubuntu / Debian
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker && sudo systemctl enable docker
```

### Verify
```bash
sudo docker run hello-world
```

---

## 3. Install GitHub CLI

### Rocky Linux / RHEL
```bash
curl -fsSL https://cli.github.com/packages/rpm/gh-cli.repo | sudo tee /etc/yum.repos.d/github-cli.repo
sudo dnf install -y gh
```

### Ubuntu / Debian
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
sudo apt update && sudo apt install -y gh
```

---

## 4. Clone and Work

```bash
cd /mnt/d/git  # or your preferred directory
git clone https://github.com/icediceice/Nutanix-S3-Demo.git
cd Nutanix-S3-Demo
```

---

## 5. Build & Push Image

```bash
# Log in to GitHub Container Registry
echo "YOUR_TOKEN" | sudo docker login ghcr.io -u icediceice --password-stdin

# Build
sudo docker build -t ghcr.io/icediceice/nkp-s3-gallery:latest .

# Push
sudo docker push ghcr.io/icediceice/nkp-s3-gallery:latest
```

---

## 6. NotebookLM Skill (Optional)

If using the NotebookLM skill in Claude Code, browser dependencies are needed:

### Rocky Linux / RHEL
```bash
sudo dnf install -y nspr nss atk at-spi2-atk cups-libs libxcb libxkbcommon \
  at-spi2-core libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
  mesa-libgbm cairo pango alsa-lib
```

### Ubuntu / Debian
```bash
sudo apt install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libxcb1 libxkbcommon0 libatspi2.0-0 libx11-6 libxcomposite1 \
  libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libcairo2 \
  libpango-1.0-0 libasound2
```

Then run auth setup:
```bash
cd ~/.claude/skills/notebooklm
python3 scripts/run.py auth_manager.py setup
```

**Note:** The file `scripts/browser_utils.py` must use `channel="chromium"` (not `channel="chrome"`) on line 31. Patch if needed:
```bash
sed -i 's/channel="chrome"/channel="chromium"/' ~/.claude/skills/notebooklm/scripts/browser_utils.py
```

---

## GitHub PAT Scopes Needed

| Scope | Why |
|-------|-----|
| `repo` | Push code to repositories |
| `workflow` | Push GitHub Actions workflow files |
| `write:packages` | Push container images to ghcr.io |
| `read:org` | Required by `gh` CLI (optional if using git directly) |

---

## Quick Verification Checklist

```bash
git config --global user.name           # → icediceice
sudo docker info >/dev/null 2>&1 && echo "Docker OK"
gh --version                            # → gh version X.X.X
```
