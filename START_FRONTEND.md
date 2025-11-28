# Starting the Frontend

The frontend needs to be started separately from the backend.

## Option 1: Separate Terminal (Recommended)

Open a **new terminal window** and run:

```bash
cd packages/frontend
npm run dev
```

This will start the frontend on http://localhost:3000

## Option 2: Run Both Together

From the root directory, run both in separate terminals:

**Terminal 1 (Backend):**
```bash
cd packages/backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd packages/frontend
npm run dev
```

## Verify It's Running

Once started, you should see:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:3000/
```

If you don't see this output, check for errors in the terminal.

