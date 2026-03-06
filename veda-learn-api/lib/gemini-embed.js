// lib/gemini-embed.js
const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-embedding-001'   // ← Updated model name
    })

    const result = await model.embedContent({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',  // ← Best for RAG use case
    })

    return result.embedding.values    // Returns 3072-dim array
}

async function generateQueryEmbedding(text) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-embedding-001'
    })

    const result = await model.embedContent({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',     // ← Use this when querying
    })

    return result.embedding.values
}

module.exports = { generateEmbedding, generateQueryEmbedding }
