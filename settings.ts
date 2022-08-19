// Mess with these in their own seperate files.
import instances from "./federation.json" assert { type: "json" };

export const settings = {
  "siteURL": "http://localhost:8080",
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
  "staticFileDir": "./static",
  "siteName": "Parasite Instance",
  "limits": {
    "maxHourlyCreations": Infinity,
    "maxTorrents": Infinity,
    "maxComments": Infinity,
    "maxLists": Infinity,
    "maxUsers": Infinity,
  },
  "federationParams": {
    "allowed": true,
    "minMembers": 10,
    "readAccess": true,
    "writeAccess": true,
    "maxHourlyInteractions": 5,
    // Must be the host of the instance.
    // EG - example.com, torrents.sickos.social, etc.
    "pooled": instances.pooled,
    "blocked": instances.blocked,
  },
  "jwt": {
    // Persistent key file.
    "keyFile": "./.keyfile.json",

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
};
