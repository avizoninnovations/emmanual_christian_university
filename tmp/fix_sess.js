const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'packages', 'backend', 'convex');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf-8');
    
    // Make session ID validation optional everywhere so we don't break existing files
    content = content.replace(/v\.id\("sessions"\)/g, 'v.optional(v.string())');
    
    // In authHelpers.ts, replace Id<"sessions"> with any to avoid TS errors
    if (file === 'authHelpers.ts') {
        content = content.replace(/sessionId:\s*Id<"sessions">/g, 'sessionId: any');
    }

    fs.writeFileSync(p, content);
});

console.log("Session ID made optional");
