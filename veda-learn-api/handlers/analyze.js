const jwt = require('jsonwebtoken');

module.exports.handler = async (event) => {
    try {
        // 1. Handle OPTIONS preflight
        if (event.httpMethod === 'OPTIONS' || event.requestContext?.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: ''
            };
        }

        // 2. Verify JWT
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'No authorization header' })
            };
        }

        const token = authHeader.replace('Bearer ', '');
        let userId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (err) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Invalid token', details: err.message })
            };
        }

        // 3. Parse request body
        const body = JSON.parse(event.body || '{}');
        const { fileContent, language, fileName, cursorLine } = body;

        console.log('Analyzing code:', { 
            userId, 
            fileName, 
            language, 
            lines: fileContent?.split('\n').length,
            cursorLine 
        });

        if (!fileContent) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'No file content provided' })
            };
        }

        // 4. Pattern detection (simple regex-based for now)
        const patterns = {
            'mutable-default': {
                pattern: /def\s+\w+\([^)]*=\s*\[\s*\]|\bdef\s+\w+\([^)]*=\s*\{\s*\}/,
                language: 'python',
                severity: 'high'
            },
            'callback-hell': {
                pattern: /function\s*\([^)]*\)\s*{\s*[^}]*function\s*\([^)]*\)\s*{[^}]*function/,
                language: 'javascript',
                severity: 'medium'
            },
            'any-type': {
                pattern: /:\s*any\b/g,
                language: 'typescript',
                severity: 'medium'
            },
            'sql-injection': {
                pattern: /execute\s*\(\s*['"]\s*SELECT.*\+|query\s*\(\s*['"]\s*SELECT.*\+/i,
                language: 'any',
                severity: 'critical'
            },
        };

        let detected = null;
        let lineNumber = 1;
        let confidence = 0;

        for (const [conceptId, config] of Object.entries(patterns)) {
            if (config.language !== 'any' && config.language !== language) continue;
            
            if (config.pattern.test(fileContent)) {
                detected = conceptId;
                confidence = 0.92;
                
                // Find line number
                const lines = fileContent.split('\n');
                const foundLine = lines.findIndex(line => config.pattern.test(line));
                lineNumber = foundLine >= 0 ? foundLine + 1 : 1;
                break;
            }
        }

        if (detected) {
            console.log('Issue detected:', { conceptId: detected, lineNumber, confidence });
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teach: true,
                    conceptId: detected,
                    lineNumber,
                    confidence,
                    message: `Detected ${detected.replace(/-/g, ' ')} pattern at line ${lineNumber}`,
                    userId
                })
            };
        }

        console.log('No issues detected');
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teach: false,
                message: 'No issues detected in the code',
                userId
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
