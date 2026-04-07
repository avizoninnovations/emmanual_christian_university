const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'packages', 'backend', 'convex');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf-8');
    
    // Remove from args definition
    content = content.replace(/sessionId:\s*v\.id\("sessions"\),?\n?/g, '');
    content = content.replace(/sessionId:\s*v\.optional\([^\)]+\)\,?\n?/g, '');
    
    // For calls to checkQueryAuth(ctx, args.sessionId, ...) -> checkQueryAuth(ctx, undefined, ...)
    content = content.replace(/args\.sessionId/g, 'undefined');
    
    // In authHelpers.ts, we need to adapt the signatures, but we'll do authHelpers separately
    if (file !== 'authHelpers.ts' && file !== 'auth.ts' && file !== 'auth.config.ts' && file !== 'convex.config.ts') {
        fs.writeFileSync(p, content);
    }
});

console.log("Refactoring complete");
