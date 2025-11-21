# ✅ PatchPilot Setup Checklist

## Quick Start (5 Minutes)

```bash
# 1. Run automated setup
chmod +x setup.sh && ./setup.sh

# 2. Start development server
npm run dev

# 3. Open browser
# Visit http://localhost:3000
```

## Manual Setup (if automated fails)

- [ ] `npm install`
- [ ] `cp .env.example .env`
- [ ] `npx prisma generate`
- [ ] `npx prisma migrate dev --name init`
- [ ] `npm run dev`

## Pre-Demo Test

- [ ] Create a test session
- [ ] Verify status updates appear
- [ ] Check logs are streaming
- [ ] Confirm page auto-refreshes

## Demo Preparation

- [ ] Prepare GitHub repo URL
- [ ] Write bug description (with stack trace)
- [ ] Choose fast reproduction command
- [ ] Test full flow once
- [ ] Clear test data (optional): `rm prisma/dev.db && npx prisma migrate dev`

## Integration Checklist (Post-Hackathon)

- [ ] **E2B Sandbox** - See `INTEGRATION_GUIDE.md` Section 1
- [ ] **LLM (Claude/GPT)** - See `INTEGRATION_GUIDE.md` Section 4
- [ ] **Exa MCP** - See `INTEGRATION_GUIDE.md` Section 3
- [ ] **GitHub MCP** - See `INTEGRATION_GUIDE.md` Section 2

## Troubleshooting

**Port 3000 in use?**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database locked?**
```bash
rm prisma/dev.db && npx prisma migrate dev --name init
```

**Module errors?**
```bash
rm -rf node_modules package-lock.json && npm install
```

**Prisma errors?**
```bash
npx prisma generate
```

---

✨ **You're ready to demo!** See `QUICKSTART.md` for detailed guide.
