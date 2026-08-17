# Self-host Postiz + connect platforms (Turn Outdoor)

English publish goes through **local Postiz** (`http://localhost:4007`). China stays on **SAU**.

Outdoor keeps title / body / cover; Postiz is transport (incl. YouTube custom thumbnail).

## 0. Start Postiz

`npm run outdoor:all` starts Postiz automatically (`docker compose up -d` in
`~/Documents/company/postiz-docker-compose`). Override with `POSTIZ_COMPOSE_DIR`,
or skip with `OUTDOOR_SKIP_POSTIZ=1`.

Manual:

```bash
cd ~/Documents/company/postiz-docker-compose
docker compose up -d
```

Open [http://localhost:4007](http://localhost:4007) → create the first user account.

Public API base (for outdoor agent):

`http://localhost:4007/api/public/v1`

## 1. Plug Postiz into outdoor UI

1. In Postiz: **Settings → Developers → Public API** → copy key  
2. Outdoor: `#/platforms` → **Publish credentials** → paste key → **Save credentials**  
3. Later: connect channels in Postiz → **4. Sync Postiz channels** (saves integration IDs + sets live)

No shell export / agent restart needed for key + sync.

## 2. Developer apps (OAuth) — do once per platform

For each network you care about:

1. Create an OAuth **web** app in that platform’s developer console  
2. Set **Authorized redirect URI** to:

   `http://localhost:4007/integrations/social/<provider>`

   (`<provider>` examples below)  
3. Put `CLIENT_ID` / `CLIENT_SECRET` into  
   `~/Documents/company/postiz-docker-compose/docker-compose.yaml`  
   under the `postiz` service `environment:` block  
4. Recreate containers:

```bash
cd ~/Documents/company/postiz-docker-compose
docker compose down
docker compose up -d
```

5. In Postiz UI → **Add channel** → complete browser OAuth for that network  

Official per-provider docs: [docs.postiz.com/providers](https://docs.postiz.com/providers/overview)

### Redirect URI cheat sheet (local Docker on :4007)

| Outdoor platform | Postiz path | Env vars in compose |
|------------------|-------------|---------------------|
| YouTube | `/integrations/social/youtube` | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| X | `/integrations/social/x` (or twitter — see Postiz docs) | `X_API_KEY`, `X_API_SECRET` |
| LinkedIn | `/integrations/social/linkedin` | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| Facebook | `/integrations/social/facebook` | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| Instagram | `/integrations/social/instagram` | same Meta app (or standalone Instagram vars) |
| Threads | `/integrations/social/threads` | `THREADS_APP_ID`, `THREADS_APP_SECRET` |
| TikTok | `/integrations/social/tiktok` | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` |
| Reddit | `/integrations/social/reddit` | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |
| Bluesky | app password in Postiz (not classic OAuth) | see [Bluesky provider](https://docs.postiz.com/providers/bluesky) |

### Sign-in order we recommend

Do **YouTube first** (custom thumbnail matters most), then X, LinkedIn, Meta (FB/IG/Threads), TikTok, Reddit, Bluesky.

#### YouTube (Google Cloud)

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)  
2. Create project → OAuth consent screen (External + add yourself as test user)  
3. Create **OAuth client ID** → Web application  
4. Redirect: `http://localhost:4007/integrations/social/youtube`  
5. Enable **YouTube Data API v3** (+ Analytics/Reporting if Postiz asks)  
6. Paste ID/secret into compose → restart Postiz → Connect YouTube in UI  
7. Channel should be verified if you need custom thumbnails  

Details: [Postiz YouTube](https://docs.postiz.com/providers/youtube)

#### X (Twitter)

1. [X Developer Portal](https://developer.x.com/) → project + app with OAuth 2 / read+write  
2. Redirect URI from Postiz X docs  
3. Set `X_API_KEY` / `X_API_SECRET` → restart → Connect  

[Postiz X](https://docs.postiz.com/providers/x-twitter)

#### LinkedIn

1. [LinkedIn Developers](https://www.linkedin.com/developers/) → Create app  
2. Products: Share on LinkedIn / Sign In with LinkedIn (as required by Postiz page)  
3. Redirect: `http://localhost:4007/integrations/social/linkedin`  
4. Set LinkedIn env vars → restart → Connect  

[Postiz LinkedIn](https://docs.postiz.com/providers/linkedin)

#### Facebook / Instagram / Threads (Meta)

1. [Meta for Developers](https://developers.facebook.com/) → Create app  
2. Add Facebook Login / Instagram / Threads products as needed  
3. Redirect URI for Facebook Page connect:
   `http://localhost:4007/integrations/social/facebook`  
4. Often needs Business verification for live posting — start in **Development** mode with your account as Admin/Developer/Tester  
5. Set `FACEBOOK_*` / `THREADS_*` (and Instagram standalone if used) → recreate Postiz  

**Do not** enable Meta’s deprecated `read_insights` (Postiz docs still list it; Meta rejects it for developers — see [postiz#1346](https://github.com/gitroomhq/postiz-app/issues/1346)).  
`outdoor:all` patches Postiz to request only:

`pages_show_list`, `pages_manage_posts`, `pages_read_engagement`

Also strip `read_insights` (and `pages_manage_engagement` if listed) from:

- App → **Use cases** → Page / Login use case → **Permissions and features**
- **Facebook Login for Business** → **Configurations** → edit each config’s permissions

Then connect in a **private window** (old Facebook OAuth sessions can keep the stock scope list after login).

[Facebook](https://docs.postiz.com/providers/facebook) · [Instagram](https://docs.postiz.com/providers/instagram) · [Threads](https://docs.postiz.com/providers/threads)

##### Instagram Standalone (personal Professional account, no Facebook Page)

Use Postiz channel **Instagram (Standalone)** — needs `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` (not the Facebook App ID).

1. Convert the IG account to **Professional** (Creator or Business) in the Instagram app  
2. Meta app → add **Instagram** product → set up **Instagram API with Instagram Login** / Business Login  
3. OAuth redirect URI must be **exactly** (Postiz wraps localhost HTTP via redirectmeto):
   ```
   https://redirectmeto.com/http://localhost:4007/integrations/social/instagram-standalone
   ```
4. Copy **Instagram App ID** + **Instagram App Secret** into compose → recreate Postiz  
5. App roles → add yourself as **Instagram Tester** → accept invite in IG → Settings → Apps and websites  
6. Postiz → Add channel → **Instagram (Standalone)**

#### TikTok

TikTok rejects plain `http://` redirect URIs. Postiz wraps localhost the same way as Instagram Standalone.

1. [TikTok for Developers](https://developers.tiktok.com/apps) → create app (Web platform)  
2. Add products: **Login Kit** + **Content Posting API** (enable **Direct Post**)  
3. Login Kit redirect URI must be **exactly**:
   ```
   https://redirectmeto.com/http://localhost:4007/integrations/social/tiktok
   ```
4. Request scopes (match Postiz): `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, `video.publish`  
5. Copy **Client Key** → `TIKTOK_CLIENT_ID`, **Client Secret** → `TIKTOK_CLIENT_SECRET` in compose → recreate Postiz  
6. Postiz → Add channel → **TikTok** (use a private window if the connect page blanks — [known issue](https://docs.postiz.com/troubleshooting/known-issues))

Caveats ([Postiz TikTok](https://docs.postiz.com/providers/tiktok)):

- Before TikTok **app audit**, Direct Post is forced to **private** (`SELF_ONLY`) and capped (~5 users / 24h).  
- TikTok pulls media via HTTPS URL — local `/uploads` won’t work for real publishes until you expose media (R2/CDN/public HTTPS). Connect/OAuth still works without that.

#### Reddit

1. Reddit app preferences → create web app  
2. Redirect: `http://localhost:4007/integrations/social/reddit`  
3. Set `REDDIT_*` → restart → Connect  

[Reddit](https://docs.postiz.com/providers/reddit)

#### Bluesky

Usually **app password** (not Google-style OAuth). Follow [Postiz Bluesky](https://docs.postiz.com/providers/bluesky) and connect in the UI.

## 3. China platforms (SAU — not Postiz)

```bash
sau bilibili login --account default
sau douyin login --account default
sau xiaohongshu login --account default
sau kuaishou login --account default
sau tencent login --account default   # wechat_channels
```

Then outdoor `#/platforms` → toggle **SAU: live** → Save.  
`weibo` stays manual.

## 4. Verify

1. `#/platforms` → **Sync Postiz channels** → EN rows show connected  
2. **Test connection** on Postiz  
3. Publish from a take’s Social panel (with cover selected for YouTube thumbnail)

### Static social cards (HTML → PNG, no video)

On the take **Social publish preview** section:

1. **Generate cards** — builds portrait + landscape PNGs (EN + 中文) from `social-posts.json` via headless Chrome. **No composite video required.**
2. **Publish image** / **Publish all image posts** — uploads PNG + caption through Postiz.

**Postiz image-only platforms:** X, LinkedIn, Instagram (feed post), Facebook, Bluesky, Threads, Reddit, TikTok (photo). **YouTube stays video-only.**

Requires Google Chrome on the Mac (`SOCIAL_CARD_CHROME` to override path). Postiz live + synced channels on `#/platforms`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Connect button missing for a platform | Env vars empty or Postiz not restarted after edit |
| `redirect_uri_mismatch` | Redirect must be exactly `http://localhost:4007/integrations/social/...` |
| Facebook `Invalid Scopes: read_insights` | Postiz is patched to omit it; Meta Use Case / Login for Business config still injects it after login. Remove `read_insights` in Meta dashboard (above). Retry in a private window. Before password, URL `scope=` should be only the 3 safe scopes — if it already has `read_insights`, you’re on a stale Facebook OAuth continue (`ret=login`). |
| Outdoor Sync: no channels | Connect at least one channel in Postiz UI first |
| API 401 from outdoor | Wrong key, or `POSTIZ_API_BASE` not `http://localhost:4007/api/public/v1` |
| YouTube no custom thumb | Cover not selected in outdoor, or channel not eligible for custom thumbs |
