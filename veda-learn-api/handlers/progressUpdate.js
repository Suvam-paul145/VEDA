module.exports.handler = async () => ({
    statusCode: 200,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify({ ok: true })
});
