export const CHUNK_ANALYSIS_PROMPT = `Analyze this transcript chunk from a long-form video.

Return a JSON object with these fields:
- viralityScore (0-100)
- emotionScore (0-100)
- hookScore (0-100)
- curiosityScore (0-100)
- educationalValue (0-100)
- engagementScore (0-100)
- topic (string)
- keywords (string[])
- bestQuote (string)
- bestClipStart (number, seconds)
- bestClipEnd (number, seconds)
- suggestedTitle (string)
- suggestedCaption (string)
- suggestedHook (string)
- suggestedThumbnailText (string)

Transcript chunk:
`;

export const THUMBNAIL_IDEAS_PROMPT = `Generate 3 thumbnail ideas for a viral short clip.

For each idea return:
- color (hex palette description)
- text (overlay text, max 5 words)
- emotion (dominant emotion)

Clip title: {{title}}
Hook: {{hook}}

Return JSON array of 3 objects.`;

export const CHUNKING_SYSTEM_PROMPT = `Split the transcript into semantic chunks of 30-60 seconds each.
Preserve exact word timestamps. Return JSON array of chunks with start, end, and text.`;
