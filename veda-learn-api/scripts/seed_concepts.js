// scripts/seed_concepts.js  (new version)
require('dotenv').config()
const { generateEmbedding } = require('../lib/gemini-embed')
const { upsertConcept } = require('../lib/pinecone')

// Your existing concept definitions — keep these exactly as-is
const CONCEPTS = [
    {
        conceptId: 'mutable-default',
        content: 'Python mutable default arguments are shared across all function calls. Using [] or {} as default parameter values causes bugs where state persists between calls. Fix by using None as default and initializing inside the function body.',
    },
    {
        conceptId: 'sql-injection',
        content: 'SQL injection occurs when user input is directly concatenated into SQL queries. Attackers can manipulate the query structure. Always use parameterized queries or prepared statements to safely handle user input.',
    },
    {
        conceptId: 'callback-hell',
        content: 'Callback hell is deeply nested callbacks in JavaScript that make code hard to read and maintain. Refactor using Promises with .then() chains or async/await syntax for flat, readable asynchronous code.',
    },
    {
        conceptId: 'any-abuse',
        content: 'TypeScript any type disables all type checking and defeats the purpose of TypeScript. Use specific types, generics, or unknown instead. any should only be used as a last resort with an explicit comment explaining why.',
    },
    {
        conceptId: 'memory-leak',
        content: 'Memory leaks in JavaScript occur when event listeners, timers, or closures hold references to objects that should be garbage collected. Always clean up with removeEventListener, clearInterval, and avoid closures capturing large objects.',
    },
    {
        conceptId: 'race-condition',
        content: 'Race conditions occur when async operations complete in unexpected order. Use proper await chains, Promise.all for parallel operations, or mutex patterns to ensure operations execute in the correct sequence.',
    },
]

async function embedAndSeed() {
    console.log(`🚀 Seeding ${CONCEPTS.length} concepts to Pinecone...`)

    for (const concept of CONCEPTS) {
        // Generate 3072-dim embedding via Gemini (gemini-embedding-001)
        const embedding = await generateEmbedding(concept.content)

        // Upsert into Pinecone
        await upsertConcept({
            conceptId: concept.conceptId,
            content: concept.content,
            embedding,
        })

        console.log(`✅ Seeded: ${concept.conceptId}`)

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000))
    }

    console.log('🎉 All concepts seeded successfully!')
    console.log('Check your Pinecone dashboard → veda-concepts index')
}

embedAndSeed().catch(console.error)
