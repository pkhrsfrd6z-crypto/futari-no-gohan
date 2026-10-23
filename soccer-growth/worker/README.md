# PITCHLOG video analysis Worker

This Worker accepts up to six JPEG still frames sampled by the PITCHLOG web app and sends them to the OpenAI Responses API for a cautious, still-frame-based review. It does not upload the original full video.

## Important setup

Do not put an OpenAI API key in `index.html`, GitHub, or the browser. Configure it as a server-side Worker secret. API use may incur charges; if you are under 18, have a parent/guardian review and manage the account and billing.

1. Create a Cloudflare Worker and deploy `index.js` from this folder.
2. In the Worker settings, add secrets named `OPENAI_API_KEY` and `PITCHLOG_KEY`. Use a strong, unique value for `PITCHLOG_KEY`; enter that same value into the PITCHLOG screen only when using analysis.
3. Set the variable `ALLOWED_ORIGIN` to the exact origin where PITCHLOG is hosted, for example `https://your-project.pages.dev`. Do not leave it as `*` for a public deployment.
4. Optionally set `OPENAI_MODEL` to a vision-capable model available to your API account. The default is `gpt-4.1-mini`, which supports image input. Confirm model availability and billing for your API account before testing.
5. In PITCHLOG, paste the Worker URL into the analysis API URL field and enter the Worker key.
6. Test first with a short clip. Check the browser console and Worker logs if the request fails.

## Request and response

The browser sends JSON with `frames` (1–6 data URLs), `position`, `period`, `focus`, and `context`. A successful response is JSON shaped like `{"analysis":"...","framesAnalyzed":6}`.

## Privacy and limitations

- Only sampled still images and the selected context are sent to the Worker; the original video is not uploaded by this feature.
- People visible in the sampled frames are still being sent to an external AI service. Obtain appropriate permission before sharing team or youth-match footage.
- A few still images cannot reliably establish continuous movement, exact pass outcomes, or a player's intent. The analysis prompt asks the model to label uncertainty.
- The app has not yet been end-to-end tested with a deployed Worker and a real API account.
