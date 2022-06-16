export const settings = {
  "siteURL": `https://www.example.org`,
  "sitePort": 8080,
  "defaultRole": "User"   
  "allowedCategories": [
    "audio",
    "documents",
    "games",
    "videos",
  ],
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
  "staticFileDir": "./static/",
  "siteName": "Parasite Instance",
  "limits": {
    "maxHourlyCreations": Infinity,
    "maxTorrents": Infinity,
    "maxComments": Infinity,
    "maxLists": Infinity,
    "maxUsers": Infinity,
  },
  "allowFederation": true,
  "federationParams": {
    "minMembers": 10,
    "readAccess": true,
    "writeAccess": true,
    "maxHourlyInteractions": 5,
    "blockedInstances": [],
  },
};
