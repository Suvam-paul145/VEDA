'use strict';

const {
  PollyClient,
  SynthesizeSpeechCommand,
} = require('@aws-sdk/client-polly');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Readable } = require('stream');

const polly  = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3     = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AUDIO_BUCKET || 'veda-learn-audio';

/**
 * Synthesize speech using Amazon Polly (Ruth Neural voice — generative quality).
 * Uploads the audio to S3 and returns a 24-hour presigned URL.
 *
 * @param {string} text   - Plain text to synthesize (max ~3000 chars)
 * @param {string} lessonId
 * @param {string} userId
 * @returns {Promise<string>} presigned S3 URL
 */
async function synthesizeLesson(text, lessonId, userId) {
  // Truncate to Polly's 3000 char limit
  const trimmed = text.slice(0, 2900);

  console.log(`[Polly] Synthesizing ${trimmed.length} characters for lesson ${lessonId}`);

  // 1. Generate audio stream from Polly
  const pollyRes = await polly.send(new SynthesizeSpeechCommand({
    Engine:       'neural',    // Use neural instead of generative for broader availability
    VoiceId:      'Joanna',    // Use Joanna as fallback if Ruth not available
    OutputFormat: 'mp3',
    Text:         trimmed,
    TextType:     'text',
  }));

  // 2. Convert stream → Buffer
  const audioBuffer = await streamToBuffer(pollyRes.AudioStream);

  // 3. Upload to S3
  const s3Key = `audio/${userId}/${lessonId}.mp3`;
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      userId,
      lessonId,
      generatedAt: new Date().toISOString(),
    },
  }));

  // 4. Generate presigned URL valid for 24 hours
  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }),
    { expiresIn: 86400 }
  );

  console.log(`[Polly] Synthesized ${audioBuffer.length} bytes → s3://${BUCKET}/${s3Key}`);
  return presignedUrl;
}

/** Convert a Readable stream to a Buffer */
async function streamToBuffer(stream) {
  if (Buffer.isBuffer(stream)) return stream;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const readable = stream instanceof Readable ? stream : Readable.from(stream);
    readable.on('data', chunk => chunks.push(chunk));
    readable.on('end',  () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

/**
 * Graceful fallback: if Polly fails (quota, region, etc.),
 * return null and the frontend will use the Web Speech API instead.
 */
async function synthesizeLessonSafe(text, lessonId, userId) {
  try {
    return await synthesizeLesson(text, lessonId, userId);
  } catch (err) {
    console.error('[Polly] Synthesis failed (will use browser TTS fallback):', err.message);
    return null;
  }
}

module.exports = { synthesizeLesson, synthesizeLessonSafe };