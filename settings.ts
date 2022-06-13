export const settings = {
  "siteURL": "www.example.org",
  "sitePort": 8080,
  "roles": "./roles.json",
  "allowedCategories": [
    "audio",
    "documents",
    "games",
    "videos"
  ],
  "database": {
    "type": "postgres",
    "settings": {
      "database": "database",
      "hostname": "localhost",
      "user": "postgres",
      "password": "password",
      "port": 5432
    }
  },
  "staticFileDir": "../static/",
  "siteName": "Parasite Instance",
  "limits" : {
    "maxHourlyCreations": Infinity,
    "maxTorrents": Infinity,
    "maxComments": Infinity,
    "maxLists": Infinity,
    "maxUsers": Infinity
  },
  "allowFederation": true,
  "federationParams": {
    "minMembers": 10,
    "readAccess": true,
    "writeAccess": true,
    "maxHourlyInteractions": 5,
    "blockedInstances": []
  }
}
