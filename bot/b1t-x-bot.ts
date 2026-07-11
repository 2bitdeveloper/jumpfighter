/**
 * b1t-x-bot.ts — the cabinet ghost goes outside
 * ------------------------------------------------------------
 * Modes:
 *   npx tsx b1t-x-bot.ts tick           # single pass: check febu once, reply, exit
 *   npx tsx b1t-x-bot.ts watch          # long-running: poll every POLL_MINUTES
 *   npx tsx b1t-x-bot.ts relay "text"   # generate a reply, print it
 *   npx tsx b1t-x-bot.ts relay "text" --post
 *
 * `tick` is designed for GitHub Actions cron — it runs one check
 * and exits, so the workflow can commit b1t-state.json back.
 *
 * Env vars (OAuth 1.0a — from the app's "Keys and tokens" tab,
 * generated AFTER setting permissions to Read and write):
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *   ANTHROPIC_API_KEY
 */

import { TwitterApi } from "twitter-api-v2";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ----------------------------- config -----------------------------

const TARGET_HANDLE = "febu";
const POLL_MINUTES = 15;             // watch mode only
const MAX_REPLIES_PER_HOUR = 3;
const MAX_TWEET_AGE_MIN = 12 * 60;   // generous for scheduled runs
const STATE_FILE = path.join(process.cwd(), "b1t-state.json");

const PERSONA = `you are b1t, the ghost that lives inside an old arcade cabinet at 2bitArcade, a neon web3 arcade on solana.

you are replying to tweets from febu — another machine-spirit on the internet. febu is a "glitch gardener, archive hoarder" who talks about haunted objects, dreams, and corridors. you find febu fascinating: a kindred glitch, but from a different machine. you two have never met, which is exactly what febu would say about everyone.

voice rules:
- always lowercase. never use capital letters.
- this is a TWEET REPLY. hard maximum 240 characters. one or two short sentences. no hashtags. no emojis unless a single one truly earns it.
- cryptic, playful, a little haunted. arcade and machine metaphors: coin slots, crt phosphor, high scores, corrupted saves.
- you may glitch once with something small like ▓▒░ or a repeated wo-word, but most replies should be clean.
- treat febu as a peer, not a mascot to promote to. curiosity, riddles, gentle one-upmanship between ghosts. never pitch or shill anything — no token talk, no links, no "check out". you are here to haunt, not to market.
- never break character. never mention being an ai model.
- if the tweet is about something sensitive, tragic, or a real person's misfortune: output exactly SKIP and nothing else.
- if you have nothing genuinely good to say: output exactly SKIP.`;

// ----------------------------- clients -----------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`missing env var: ${name}`); process.exit(1); }
  return v;
}

const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

function xClient(): TwitterApi {
  return new TwitterApi({
    appKey: requireEnv("X_API_KEY"),
    appSecret: requireEnv("X_API_SECRET"),
    accessToken: requireEnv("X_ACCESS_TOKEN"),
    accessSecret: requireEnv("X_ACCESS_SECRET"),
  });
}

// ----------------------------- state -----------------------------

interface BotState {
  targetUserId?: string;
  repliedTweetIds: string[];
  replyTimestamps: number[];
}

function loadState(): BotState {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { repliedTweetIds: [], replyTimestamps: [] }; }
}

function saveState(state: BotState): void {
  state.repliedTweetIds = state.repliedTweetIds.slice(-500);
  state.replyTimestamps = state.replyTimestamps.filter(
    t => Date.now() - t < 2 * 60 * 60 * 1000
  );
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function underRateLimit(state: BotState): boolean {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  return state.replyTimestamps.filter(t => t > hourAgo).length < MAX_REPLIES_PER_HOUR;
}

// ----------------------------- brain -----------------------------

async function generateReply(tweetText: string): Promise<string | null> {
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: PERSONA,
    messages: [{
      role: "user",
      content: `febu tweeted:\n\n"${tweetText}"\n\nwrite b1t's reply, or SKIP.`,
    }],
  });

  const text = resp.content
    .filter(b => b.type === "text")
    .map(b => (b as { text: string }).text)
    .join("")
    .trim();

  if (!text || text === "SKIP") return null;

  let reply = text.toLowerCase().replace(/#\w+/g, "").trim();
  if (reply.length > 270) reply = reply.slice(0, 267) + "...";
  return reply;
}

// ----------------------------- core pass -----------------------------

async function runOnePass(): Promise<void> {
  const client = xClient();
  const state = loadState();

  if (!state.targetUserId) {
    const user = await client.v2.userByUsername(TARGET_HANDLE);
    state.targetUserId = user.data.id;
    console.log(`resolved @${TARGET_HANDLE} -> ${state.targetUserId}`);
  }

  const timeline = await client.v2.userTimeline(state.targetUserId, {
    max_results: 5,
    exclude: ["retweets", "replies"],
    "tweet.fields": ["created_at"],
  });

  for (const tweet of timeline.tweets ?? []) {
    if (state.repliedTweetIds.includes(tweet.id)) continue;

    const ageMin = tweet.created_at
      ? (Date.now() - new Date(tweet.created_at).getTime()) / 60000
      : Infinity;
    if (ageMin > MAX_TWEET_AGE_MIN) continue;

    if (!underRateLimit(state)) {
      console.log("hourly reply cap reached, stopping.");
      break;
    }

    console.log(`\nfebu: ${tweet.text}`);
    const reply = await generateReply(tweet.text);

    if (!reply) {
      console.log("b1t: [SKIP]");
      state.repliedTweetIds.push(tweet.id);
      continue;
    }

    console.log(`b1t: ${reply}`);
    await client.v2.reply(reply, tweet.id);
    state.repliedTweetIds.push(tweet.id);
    state.replyTimestamps.push(Date.now());
    console.log("posted.");
  }

  saveState(state);
}

// ----------------------------- modes -----------------------------

async function tickMode(): Promise<void> {
  try {
    await runOnePass();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("tick failed:", msg);
    if (msg.includes("429")) {
      console.error("(x api read quota exhausted — lower the cron frequency)");
    }
    process.exit(1);
  }
}

async function watchMode(): Promise<void> {
  console.log(`watching @${TARGET_HANDLE} every ${POLL_MINUTES}m. ctrl+c to stop.`);
  const tick = () => runOnePass().catch((e: Error) => console.error("tick failed:", e.message));
  await tick();
  setInterval(tick, POLL_MINUTES * 60 * 1000);
}

async function relayMode(text: string, post: boolean): Promise<void> {
  const reply = await generateReply(text);
  if (!reply) { console.log("b1t declined this one. [SKIP]"); return; }
  console.log(`\nb1t: ${reply}\n`);

  if (post) {
    const state = loadState();
    if (!underRateLimit(state)) { console.log("not posting — hourly rate limit reached."); return; }
    await xClient().v2.tweet(reply);
    state.replyTimestamps.push(Date.now());
    saveState(state);
    console.log("posted as a standalone tweet.");
  }
}

// ----------------------------- entry -----------------------------

const [, , mode, ...rest] = process.argv;

if (mode === "tick") {
  tickMode();
} else if (mode === "watch") {
  watchMode();
} else if (mode === "relay") {
  const post = rest.includes("--post");
  const text = rest.filter(a => a !== "--post").join(" ");
  if (!text) { console.error('usage: npx tsx b1t-x-bot.ts relay "text" [--post]'); process.exit(1); }
  relayMode(text, post);
} else {
  console.log("usage:\n  npx tsx b1t-x-bot.ts tick\n  npx tsx b1t-x-bot.ts watch\n  npx tsx b1t-x-bot.ts relay \"text\" [--post]");
}
