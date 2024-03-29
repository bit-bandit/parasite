export const settings = {
  // DO NOT end this url with a slash!
  "siteURL": "http://localhost:8000",
  "sitePort": 8080,
  "frontendURL": "http://localhost:8000",
  "defaultRole": "User",
  "database": {
    "type": "postgres",
    "settings": {
      "database": "parasite",
      "hostname": "localhost",
      "user": "admin",
      "password": "password",
      "port": 5433,
    },
  },
  // Static file settings - Can either be
  // local, or with Supabase.
  // Options:
  //   - type: 'local' | 'supabase' ()
  //   - location: File path - if local - or Supabase URL. Don't include a trailing '/', here.
  //
  //   - name: string, Bucket name (Supabase only)
  //   - key: string, API access key (Supabase only)
  "static": {
    "type": "local",
    "location": "./static",
  },
  "siteName": "Parasite Instance",
  "allowRegistrations": true,
  "userDefaults": {
    "avatar": "./static/defs/avatar.png",
    "banner": "./static/defs/banner.png",
    "role": "User",
    "bio": "",
  },
  "limits": {
    "minListItems": 3,
    "maxListItems": 120,
    "maxHourlyCreations": Infinity,
    "maxTorrents": Infinity,
    "maxComments": Infinity,
    "maxLists": Infinity,
    "maxUsers": Infinity,
    "loginsPerUser": 5,
    "maxTitleLength": 75,
    "maxContentLength": 2500,
    "maxCommentLength": 250,
  },
  "federationParams": {
    "allowed": true,
    "minMembers": 10,
    "readAccess": true,
    "writeAccess": true,
    "maxHourlyInteractions": 5,
    // Must be the host of the instance.
    // EG - example.com, torrents.sickos.social, etc.
  },
  "jwt": {
    // You can generally afford to keep this longer-term,
    // but it's still good practice to cycle keys.
    "keyLifetime": 60 * 60 * 24 * 7 * 9, // = 9 weeks, ~3 months

    // Don't touch keyAlg* or keySign* if you don't know what you're doing.
    // Make sure the algorithms match, otherwise things break.
    "keyAlgStr": "HS512",
    "keyAlgObj": { name: "HMAC", hash: "SHA-512" },
    "keySignObj": { name: "HMAC" },

    // Keep the token lifetime somewhat low, but not annoyingly so.
    // Shorter lifetimes reduce the time window that tokens will work,
    // but increase how often users have to log in.
    "tokenLifetime": 60 * 60 * 24 * 7, // = 1 week
  },
  // Ensure Webfinger to be HTTP only
  "webfingerSecureOnly": true,
};
