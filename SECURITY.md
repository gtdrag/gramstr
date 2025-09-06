# Security Implementation Guide

## 🔒 Secure Credential Storage

### NOSTR Private Keys
- **Desktop App**: Stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Web App**: Must be configured via environment variables (less secure)
- **Migration**: Automatic migration from .env to secure storage on first launch

### How to Set Up Secure NOSTR Keys

#### Desktop Application (Recommended)
1. Launch the Gramstr desktop app
2. Navigate to Settings → NOSTR Configuration
3. Either:
   - Click "Generate New" to create a new key pair
   - Enter your existing `nsec` private key
4. Click "Save Securely" to store in OS keychain
5. The key is now encrypted and hardware-bound

#### Migration from Environment
If you previously had `NOSTR_PRIVATE_KEY` in your .env file:
1. Launch the desktop app
2. The app will automatically detect and migrate the key
3. The key will be removed from the environment and stored securely

### API Keys and Secrets

#### Required Secrets (Store in Secret Manager)
```bash
# Critical secrets that must NEVER be in code:
CLERK_SECRET_KEY
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

#### Recommended Storage Solutions
1. **HashiCorp Vault** - Enterprise secret management
2. **AWS Secrets Manager** - For AWS deployments
3. **Vercel Environment Variables** - For Vercel deployments
4. **Docker Secrets** - For containerized deployments

### Database Security

#### Connection String Security
```bash
# Bad - credentials in URL
DATABASE_URL=postgresql://user:password@host:5432/db

# Good - use environment variable references
DATABASE_URL=${DB_PROTOCOL}://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Best - use IAM/certificate authentication
DATABASE_URL=postgresql://host:5432/db?sslmode=require&sslcert=/path/to/cert
```

### Environment File Security

#### File Permissions
```bash
# Set restrictive permissions on .env files
chmod 600 .env.local
chmod 600 .env.production.local
```

#### Git Security
```bash
# Ensure .gitignore includes all env files
.env
.env.*
!.env.example
!.env.production.secure

# Remove sensitive files from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env*' \
  --prune-empty --tag-name-filter cat -- --all
```

## 🛡️ Security Checklist

### Before Deployment
- [ ] All credentials removed from code
- [ ] Environment variables configured in deployment platform
- [ ] NOSTR keys stored in OS keychain (desktop) or secure env (server)
- [ ] Database using connection pooling with SSL
- [ ] API rate limiting configured
- [ ] Authentication middleware enabled
- [ ] Debug endpoints removed from production

### Regular Security Tasks
- [ ] Rotate credentials every 90 days
- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Security scan with `npm audit`
- [ ] Penetration testing quarterly

## 🚨 Incident Response

### If Credentials Are Exposed
1. **Immediately rotate all affected credentials**
2. **Check access logs for unauthorized use**
3. **Update all deployed instances**
4. **Notify affected users if applicable**
5. **Document incident and remediation**

### Security Contacts
- Security issues: security@gramstr.com
- Bug bounty program: bounty.gramstr.com
- Emergency hotline: [Configure emergency contact]

## 📝 Security Best Practices

### Code Security
```typescript
// NEVER do this
const PRIVATE_KEY = "nsec1abc..."

// Do this instead
const privateKey = await secureStorage.get('nostr_key')
```

### API Security
```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
})

app.use('/api/', limiter)
```

### Authentication
```typescript
// Always verify authentication
export async function middleware(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId && request.nextUrl.pathname.startsWith('/api/protected')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.next()
}
```

## 🔐 Encryption Details

### OS Keychain Integration
- **macOS**: Uses Keychain Services API
- **Windows**: Uses Windows Credential Manager
- **Linux**: Uses Secret Service API (GNOME Keyring/KWallet)

### Fallback Encryption
If OS keychain is unavailable:
1. Uses Electron's `safeStorage` API
2. Derives key from hardware identifiers
3. Encrypts with AES-256-GCM
4. Stores encrypted blob locally

### Security Guarantees
- Keys never stored in plain text
- Keys never transmitted over network
- Keys bound to user account and device
- Automatic cleanup on uninstall