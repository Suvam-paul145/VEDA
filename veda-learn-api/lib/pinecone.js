// lib/pinecone.js
// ─── DROP-IN REPLACEMENT for all OpenSearch vector operations ───

const { Pinecone } = require('@pinecone-database/pinecone')

let _client = null
let _index = null

// Lazy init — only creates connection when first called
function getIndex() {
    if (_index) return _index

    _client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    _index = _client.index(process.env.PINECONE_INDEX || 'veda-concepts')
    return _index
}

// ─── UPSERT a concept vector ─────────────────────────────────────
// Call this when seeding concepts or adding new ones
async function upsertConcept({ conceptId, content, embedding }) {
    const index = getIndex()

    await index.upsert({
        records: [{
            id: conceptId,
            values: embedding,          // 3072-dim array from Gemini
            metadata: {
                conceptId,
                content: content.slice(0, 1000),  // Pinecone metadata limit
            }
        }]
    })

    console.log(`✅ Pinecone upserted: ${conceptId}`)
}

// ─── QUERY similar concepts ──────────────────────────────────────
// Call this in lesson.js to find relevant concept docs (RAG)
async function querySimilarConcepts(embedding, topK = 3) {
    const index = getIndex()

    const results = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
    })

    // Return in same shape your lesson.js already expects
    return results.matches.map(match => ({
        conceptId: match.metadata.conceptId,
        content: match.metadata.content,
        score: match.score,           // 0–1, higher = more similar
    }))
}

// ─── DELETE a concept (if you need to refresh it) ────────────────
async function deleteConcept(conceptId) {
    const index = getIndex()
    await index.deleteOne(conceptId)
    console.log(`🗑️ Pinecone deleted: ${conceptId}`)
}

// ─── CHECK index stats (useful for debugging) ────────────────────
async function getStats() {
    const index = getIndex()
    const stats = await index.describeIndexStats()
    console.log('Pinecone stats:', stats)
    return stats
}

module.exports = {
    upsertConcept,
    querySimilarConcepts,
    deleteConcept,
    getStats,
}
